import { Anthropic } from "@anthropic-ai/sdk"
import ModelClient from "@azure-rest/ai-inference"
import { isUnexpected } from "@azure-rest/ai-inference"
import { AzureKeyCredential } from "@azure/core-auth"
import {
	ApiHandlerOptions,
	ModelInfo,
	azureAiDefaultModelId,
	AzureAiModelId,
	azureAiModels,
	AzureDeploymentConfig,
} from "../../shared/api"
import { ApiHandler, SingleCompletionHandler } from "../index"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"
import { createSseStream } from "@azure/core-rest-pipeline"

export class AzureAiHandler implements ApiHandler, SingleCompletionHandler {
	private options: ApiHandlerOptions
	private client: ModelClient

	constructor(options: ApiHandlerOptions) {
		this.options = options

		if (!options.azureAiEndpoint) {
			throw new Error("Azure AI endpoint is required")
		}

		if (!options.azureAiKey) {
			throw new Error("Azure AI key is required")
		}

		this.client = new ModelClient(options.azureAiEndpoint, new AzureKeyCredential(options.azureAiKey))
	}

	private getDeploymentConfig(): AzureDeploymentConfig {
		const model = this.getModel()
		const defaultConfig = azureAiModels[model.id].defaultDeployment

		return {
			name: this.options.azureAiDeployments?.[model.id]?.name || defaultConfig.name,
			apiVersion: this.options.azureAiDeployments?.[model.id]?.apiVersion || defaultConfig.apiVersion,
			modelMeshName: this.options.azureAiDeployments?.[model.id]?.modelMeshName,
		}
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const modelInfo = this.getModel().info
		const chatMessages = [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)]

		try {
			const response = await this.client
				.path("/chat/completions")
				.post({
					body: {
						messages: chatMessages,
						temperature: 0,
						stream: true,
						max_tokens: modelInfo.maxTokens,
						response_format: { type: "text" }, // Ensure text format for chat
					},
					headers: this.getDeploymentConfig().modelMeshName
						? {
								"x-ms-model-mesh-model-name": this.getDeploymentConfig().modelMeshName,
							}
						: undefined,
				})
				.asNodeStream()

			const stream = response.body
			if (!stream) {
				throw new Error(`Failed to get chat completions with status: ${response.status}`)
			}

			if (response.status !== 200) {
				throw new Error(`Failed to get chat completions: ${response.body.error}`)
			}

			const sseStream = createSseStream(stream)

			for await (const event of sseStream) {
				if (event.data === "[DONE]") {
					return
				}

				try {
					const data = JSON.parse(event.data)
					const delta = data.choices[0]?.delta

					if (delta?.content) {
						yield {
							type: "text",
							text: delta.content,
						}
					}

					if (data.usage) {
						yield {
							type: "usage",
							inputTokens: data.usage.prompt_tokens || 0,
							outputTokens: data.usage.completion_tokens || 0,
						}
					}
				} catch (e) {
					// Ignore parse errors from incomplete chunks
					continue
				}
			}
		} catch (error) {
			if (error instanceof Error) {
				// Handle Azure-specific error cases
				if ("status" in error && error.status === 429) {
					throw new Error("Azure AI rate limit exceeded. Please try again later.")
				}
				if ("status" in error && error.status === 400) {
					const azureError = error as any
					if (azureError.body?.error?.code === "ContentFilterError") {
						throw new Error("Content was flagged by Azure AI content safety filters")
					}
				}
				throw new Error(`Azure AI error: ${error.message}`)
			}
			throw error
		}
	}

	getModel(): { id: AzureAiModelId; info: ModelInfo } {
		const modelId = this.options.apiModelId
		if (modelId && modelId in azureAiModels) {
			const id = modelId as AzureAiModelId
			return { id, info: azureAiModels[id] }
		}
		return { id: azureAiDefaultModelId, info: azureAiModels[azureAiDefaultModelId] }
	}

	async completePrompt(prompt: string): Promise<string> {
		try {
			const response = await this.client.path("/chat/completions").post({
				body: {
					messages: [{ role: "user", content: prompt }],
					temperature: 0,
					response_format: { type: "text" },
				},
				headers: this.getDeploymentConfig().modelMeshName
					? {
							"x-ms-model-mesh-model-name": this.getDeploymentConfig().modelMeshName,
						}
					: undefined,
			})

			if (isUnexpected(response)) {
				throw response.body.error
			}

			return response.body.choices[0]?.message?.content || ""
		} catch (error) {
			if (error instanceof Error) {
				// Handle Azure-specific error cases
				if ("status" in error && error.status === 429) {
					throw new Error("Azure AI rate limit exceeded. Please try again later.")
				}
				if ("status" in error && error.status === 400) {
					const azureError = error as any
					if (azureError.body?.error?.code === "ContentFilterError") {
						throw new Error("Content was flagged by Azure AI content safety filters")
					}
				}
				throw new Error(`Azure AI completion error: ${error.message}`)
			}
			throw error
		}
	}
}
