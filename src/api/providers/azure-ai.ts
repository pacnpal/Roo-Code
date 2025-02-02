import { Anthropic } from "@anthropic-ai/sdk"
import ModelClient from "@azure-rest/ai-inference"
import { isUnexpected } from "@azure-rest/ai-inference"
import { AzureKeyCredential } from "@azure/core-auth"
import { ApiHandlerOptions, ModelInfo, AzureDeploymentConfig } from "../../shared/api"
import { ApiHandler, SingleCompletionHandler } from "../index"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"

const DEFAULT_API_VERSION = "2024-02-15-preview"
const DEFAULT_MAX_TOKENS = 4096

export class AzureAiHandler implements ApiHandler, SingleCompletionHandler {
	private options: ApiHandlerOptions
	private client: ReturnType<typeof ModelClient>

	constructor(options: ApiHandlerOptions) {
		this.options = options

		if (!options.azureAiEndpoint) {
			throw new Error("Azure AI endpoint is required")
		}

		if (!options.azureAiKey) {
			throw new Error("Azure AI key is required")
		}

		this.client = ModelClient(options.azureAiEndpoint, new AzureKeyCredential(options.azureAiKey))
	}

	private getDeploymentConfig(): AzureDeploymentConfig {
		const modelId = this.options.apiModelId
		if (!modelId) {
			return {
				name: "gpt-35-turbo", // Default deployment name if none specified
				apiVersion: DEFAULT_API_VERSION,
			}
		}

		const customConfig = this.options.azureAiDeployments?.[modelId]
		if (customConfig) {
			return {
				name: customConfig.name,
				apiVersion: customConfig.apiVersion || DEFAULT_API_VERSION,
				modelMeshName: customConfig.modelMeshName,
			}
		}

		// If no custom config, use model ID as deployment name
		return {
			name: modelId,
			apiVersion: DEFAULT_API_VERSION,
		}
	}

	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		const deployment = this.getDeploymentConfig()
		const chatMessages = [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)]

		try {
			const response = await this.client
				.path("/chat/completions")
				.post({
					body: {
						messages: chatMessages,
						temperature: 0,
						stream: true,
						max_tokens: DEFAULT_MAX_TOKENS,
						response_format: { type: "text" },
					},
					headers: deployment.modelMeshName
						? {
								"x-ms-model-mesh-model-name": deployment.modelMeshName,
							}
						: undefined,
				})
				.asNodeStream()

			const stream = response.body
			if (!stream) {
				throw new Error("Failed to get chat completions stream")
			}

			const statusCode = Number(response.status)
			if (statusCode !== 200) {
				throw new Error(`Failed to get chat completions: HTTP ${statusCode}`)
			}

			for await (const chunk of stream) {
				const chunkStr = chunk.toString()
				if (chunkStr === "data: [DONE]\n\n") {
					return
				}

				try {
					const data = JSON.parse(chunkStr.replace("data: ", ""))
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

	getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.apiModelId || "gpt-35-turbo",
			info: {
				maxTokens: DEFAULT_MAX_TOKENS,
				contextWindow: 16385, // Conservative default
				supportsPromptCache: true,
			},
		}
	}

	async completePrompt(prompt: string): Promise<string> {
		try {
			const deployment = this.getDeploymentConfig()
			const response = await this.client.path("/chat/completions").post({
				body: {
					messages: [{ role: "user", content: prompt }],
					temperature: 0,
					response_format: { type: "text" },
				},
				headers: deployment.modelMeshName
					? {
							"x-ms-model-mesh-model-name": deployment.modelMeshName,
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
