import { AzureAiHandler } from "../azure-ai"
import { ApiHandlerOptions } from "../../../shared/api"
import { Readable } from "stream"
import ModelClient from "@azure-rest/ai-inference"

// Mock isUnexpected separately since it's a named export
const mockIsUnexpected = jest.fn()
jest.mock("@azure-rest/ai-inference", () => {
	return {
		__esModule: true,
		default: jest.fn(),
		isUnexpected: () => mockIsUnexpected(),
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
		mockIsUnexpected.mockReturnValue(false)
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
		const mockPost = jest.fn().mockResolvedValue({
			status: 200,
			body: {
				choices: [
					{
						message: {
							content: "test response",
						},
					},
				],
			},
		})

		const mockPath = jest.fn().mockReturnValue({ post: mockPost })
		;(ModelClient as jest.Mock).mockReturnValue({ path: mockPath })

		const handler = new AzureAiHandler(mockOptions)
		const result = await handler.completePrompt("test prompt")

		expect(result).toBe("test response")
		expect(mockPath).toHaveBeenCalledWith("/chat/completions")
		expect(mockPost).toHaveBeenCalledWith(expect.any(Object))
	})

	test("handles streaming responses correctly", async () => {
		// Create a mock stream that properly emits SSE data
		class MockReadable extends Readable {
			private chunks: string[]
			private index: number

			constructor() {
				super()
				this.chunks = [
					'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
					'data: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":2}}\n\n',
					"data: [DONE]\n\n",
				]
				this.index = 0
			}

			override _read() {
				if (this.index < this.chunks.length) {
					this.push(Buffer.from(this.chunks[this.index++]))
				} else {
					this.push(null)
				}
			}
		}

		const mockStream = new MockReadable()

		// Mock the client response with proper structure
		const mockResponse = {
			status: 200,
			_response: { status: 200 },
			body: mockStream,
		}

		const mockPost = jest.fn().mockReturnValue({
			asNodeStream: jest.fn().mockResolvedValue(mockResponse),
		})
		const mockPath = jest.fn().mockReturnValue({ post: mockPost })
		;(ModelClient as jest.Mock).mockReturnValue({ path: mockPath })

		const handler = new AzureAiHandler(mockOptions)
		const messages = []

		// Process the stream
		for await (const message of handler.createMessage("system prompt", [])) {
			messages.push(message)
		}

		// Verify the results
		expect(messages).toEqual([
			{ type: "text", text: "Hello" },
			{ type: "text", text: " world" },
			{ type: "usage", inputTokens: 10, outputTokens: 2 },
		])

		// Verify the client was called correctly
		expect(mockPath).toHaveBeenCalledWith("/chat/completions")
		expect(mockPost).toHaveBeenCalledWith({
			body: {
				messages: [{ role: "system", content: "system prompt" }],
				temperature: 0,
				stream: true,
				max_tokens: 4096,
				response_format: { type: "text" },
			},
			headers: undefined,
		})
	})

	test("handles rate limit errors", async () => {
		const mockError = new Error("Rate limit exceeded")
		Object.defineProperty(mockError, "status", { value: 429 })

		const mockPost = jest.fn().mockRejectedValue(mockError)
		const mockPath = jest.fn().mockReturnValue({ post: mockPost })
		;(ModelClient as jest.Mock).mockReturnValue({ path: mockPath })

		const handler = new AzureAiHandler(mockOptions)
		await expect(handler.completePrompt("test")).rejects.toThrow(
			"Azure AI rate limit exceeded. Please try again later.",
		)
	})

	test("handles content safety errors", async () => {
		const mockError = new Error("Content filter error")
		Object.defineProperty(mockError, "status", { value: 400 })
		Object.defineProperty(mockError, "body", {
			value: {
				error: {
					code: "ContentFilterError",
					message: "Content was flagged by content safety filters",
				},
			},
		})

		const mockPost = jest.fn().mockRejectedValue(mockError)
		const mockPath = jest.fn().mockReturnValue({ post: mockPost })
		;(ModelClient as jest.Mock).mockReturnValue({ path: mockPath })

		const handler = new AzureAiHandler(mockOptions)
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

		expect(model.id).toBe("gpt-35-turbo")
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
		expect(model.info.contextWindow).toBe(16385)
	})
})
