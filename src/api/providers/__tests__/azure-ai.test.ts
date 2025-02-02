import { AzureAiHandler } from "../azure-ai"
import { ApiHandlerOptions } from "../../../shared/api"
import { Readable } from "stream"
import ModelClient from "@azure-rest/ai-inference"

// Mock the Azure AI client
jest.mock("@azure-rest/ai-inference", () => {
	const mockClient = jest.fn().mockImplementation(() => ({
		path: jest.fn().mockReturnValue({
			post: jest.fn(),
		}),
	}))

	return {
		__esModule: true,
		default: mockClient,
		isUnexpected: jest.fn(),
	}
})

describe("AzureAiHandler", () => {
	const mockOptions: ApiHandlerOptions = {
		apiModelId: "azure-gpt-35",
		azureAiEndpoint: "https://test-resource.inference.azure.com",
		azureAiKey: "test-key",
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	test("constructs with required options", () => {
		const handler = new AzureAiHandler(mockOptions)
		expect(handler).toBeInstanceOf(AzureAiHandler)
	})

	test("throws error without endpoint", () => {
		const invalidOptions = { ...mockOptions }
		delete invalidOptions.azureAiEndpoint
		expect(() => new AzureAiHandler(invalidOptions)).toThrow("Azure AI endpoint is required")
	})

	test("throws error without API key", () => {
		const invalidOptions = { ...mockOptions }
		delete invalidOptions.azureAiKey
		expect(() => new AzureAiHandler(invalidOptions)).toThrow("Azure AI key is required")
	})

	test("creates chat completion correctly", async () => {
		const handler = new AzureAiHandler(mockOptions)
		const mockResponse = {
			body: {
				choices: [
					{
						message: {
							content: "test response",
						},
					},
				],
			},
		}

		const mockClient = ModelClient as jest.MockedFunction<typeof ModelClient>
		mockClient.mockReturnValue({
			path: jest.fn().mockReturnValue({
				post: jest.fn().mockResolvedValue(mockResponse),
			}),
		} as any)

		const result = await handler.completePrompt("test prompt")
		expect(result).toBe("test response")
	})

	test("handles streaming responses correctly", async () => {
		const handler = new AzureAiHandler(mockOptions)
		const mockStream = new Readable({
			read() {
				this.push('data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n')
				this.push(
					'data: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":2}}\n\n',
				)
				this.push("data: [DONE]\n\n")
				this.push(null)
			},
		})

		const mockResponse = {
			status: 200,
			body: mockStream,
		}

		const mockClient = ModelClient as jest.MockedFunction<typeof ModelClient>
		mockClient.mockReturnValue({
			path: jest.fn().mockReturnValue({
				post: jest.fn().mockReturnValue({
					asNodeStream: () => Promise.resolve(mockResponse),
				}),
			}),
		} as any)

		const messages = []
		for await (const message of handler.createMessage("system prompt", [])) {
			messages.push(message)
		}

		expect(messages).toEqual([
			{ type: "text", text: "Hello" },
			{ type: "text", text: " world" },
			{ type: "usage", inputTokens: 10, outputTokens: 2 },
		])
	})

	test("handles rate limit errors", async () => {
		const handler = new AzureAiHandler(mockOptions)
		const mockError = new Error("Rate limit exceeded")
		Object.assign(mockError, { status: 429 })

		const mockClient = ModelClient as jest.MockedFunction<typeof ModelClient>
		mockClient.mockReturnValue({
			path: jest.fn().mockReturnValue({
				post: jest.fn().mockRejectedValue(mockError),
			}),
		} as any)

		await expect(handler.completePrompt("test")).rejects.toThrow(
			"Azure AI rate limit exceeded. Please try again later.",
		)
	})

	test("handles content safety errors", async () => {
		const handler = new AzureAiHandler(mockOptions)
		const mockError = {
			status: 400,
			body: {
				error: {
					code: "ContentFilterError",
					message: "Content was flagged by content safety filters",
				},
			},
		}

		const mockClient = ModelClient as jest.MockedFunction<typeof ModelClient>
		mockClient.mockReturnValue({
			path: jest.fn().mockReturnValue({
				post: jest.fn().mockRejectedValue(mockError),
			}),
		} as any)

		await expect(handler.completePrompt("test")).rejects.toThrow(
			"Content was flagged by Azure AI content safety filters",
		)
	})

	test("falls back to default model configuration", () => {
		const handler = new AzureAiHandler({
			azureAiEndpoint: "https://test.azure.com",
			azureAiKey: "test-key",
		})
		const model = handler.getModel()

		expect(model.id).toBe("azure-gpt-35")
		expect(model.info).toBeDefined()
	})

	test("supports custom deployment names", async () => {
		const customOptions = {
			...mockOptions,
			apiModelId: "custom-model",
			azureAiDeployments: {
				"custom-model": {
					name: "my-custom-deployment",
					apiVersion: "2024-02-15-preview",
					modelMeshName: "my-custom-model",
				},
			},
		}

		const handler = new AzureAiHandler(customOptions)
		const model = handler.getModel()

		expect(model.id).toBe("custom-model")
		expect(model.info).toBeDefined()
	})
})
