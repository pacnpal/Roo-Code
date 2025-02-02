import { AzureAiHandler } from "../azure-ai"
import { ApiHandlerOptions } from "../../../shared/api"
import { Readable } from "stream"
import ModelClient from "@azure-rest/ai-inference"

// Mock the Azure AI client
jest.mock("@azure-rest/ai-inference", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      path: jest.fn().mockReturnValue({
        post: jest.fn()
      })
    })),
    isUnexpected: jest.fn()
  }
})

describe("AzureAiHandler", () => {
  const mockOptions: ApiHandlerOptions = {
    apiProvider: "azure-ai",
    apiModelId: "azure-gpt-35",
    azureAiEndpoint: "https://test-resource.inference.azure.com",
    azureAiKey: "test-key",
    azureAiDeployments: {
      "azure-gpt-35": {
        name: "custom-gpt35",
        apiVersion: "2024-02-15-preview",
        modelMeshName: "test-mesh-model"
      }
    }
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
              content: "test response"
            }
          }
        ]
      }
    }
    
    const mockClient = ModelClient as jest.MockedClass<typeof ModelClient>
    mockClient.prototype.path.mockReturnValue({
      post: jest.fn().mockResolvedValue(mockResponse)
    })

    const result = await handler.completePrompt("test prompt")
    expect(result).toBe("test response")

    expect(mockClient.prototype.path).toHaveBeenCalledWith("/chat/completions")
    expect(mockClient.prototype.path().post).toHaveBeenCalledWith({
      body: {
        messages: [{ role: "user", content: "test prompt" }],
        temperature: 0
      }
    })
  })

  test("handles streaming responses correctly", async () => {
    const handler = new AzureAiHandler(mockOptions)
    const mockStream = Readable.from([
      'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":2}}\n\n',
      'data: [DONE]\n\n'
    ])

    const mockClient = ModelClient as jest.MockedClass<typeof ModelClient>
    mockClient.prototype.path.mockReturnValue({
      post: jest.fn().mockResolvedValue({
        status: 200,
        body: mockStream,
      })
    })

    const messages = []
    for await (const message of handler.createMessage("system prompt", [])) {
      messages.push(message)
    }

    expect(messages).toEqual([
      { type: "text", text: "Hello" },
      { type: "text", text: " world" },
      { type: "usage", inputTokens: 10, outputTokens: 2 }
    ])

    expect(mockClient.prototype.path().post).toHaveBeenCalledWith({
      body: {
        messages: [{ role: "system", content: "system prompt" }],
        temperature: 0,
        stream: true,
        max_tokens: expect.any(Number)
      }
    })
  })

  test("handles rate limit errors", async () => {
    const handler = new AzureAiHandler(mockOptions)
    const mockError = new Error("Rate limit exceeded")
    Object.assign(mockError, { status: 429 })

    const mockClient = ModelClient as jest.MockedClass<typeof ModelClient>
    mockClient.prototype.path.mockReturnValue({
      post: jest.fn().mockRejectedValue(mockError)
    })

    await expect(handler.completePrompt("test")).rejects.toThrow(
      "Azure AI rate limit exceeded. Please try again later."
    )
  })

  test("handles content safety errors", async () => {
    const handler = new AzureAiHandler(mockOptions)
    const mockError = {
      status: 400,
      body: {
        error: {
          code: "ContentFilterError",
          message: "Content was flagged by content safety filters"
        }
      }
    }

    const mockClient = ModelClient as jest.MockedClass<typeof ModelClient>
    mockClient.prototype.path.mockReturnValue({
      post: jest.fn().mockRejectedValue(mockError)
    })

    await expect(handler.completePrompt("test")).rejects.toThrow(
      "Azure AI completion error: Content was flagged by content safety filters"
    )
  })

  test("falls back to default model configuration", async () => {
    const options = { ...mockOptions }
    delete options.azureAiDeployments

    const handler = new AzureAiHandler(options)
    const model = handler.getModel()

    expect(model.id).toBe("azure-gpt-35")
    expect(model.info).toBeDefined()
    expect(model.info.defaultDeployment.name).toBe("azure-gpt-35")
  })
})