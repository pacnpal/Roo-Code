import * as vscode from "vscode"

export type ApiProvider =
	| "anthropic"
	| "glama"
	| "openrouter"
	| "bedrock"
	| "vertex"
	| "openai"
	| "ollama"
	| "lmstudio"
	| "gemini"
	| "openai-native"
	| "deepseek"
	| "vscode-lm"
	| "mistral"
	| "unbound"
	| "azure-ai"

export interface ApiHandlerOptions {
	apiModelId?: string
	apiKey?: string // anthropic
	anthropicBaseUrl?: string
	vsCodeLmModelSelector?: vscode.LanguageModelChatSelector
	glamaModelId?: string
	glamaModelInfo?: ModelInfo
	glamaApiKey?: string
	openRouterApiKey?: string
	openRouterModelId?: string
	openRouterModelInfo?: ModelInfo
	openRouterBaseUrl?: string
	awsAccessKey?: string
	awsSecretKey?: string
	awsSessionToken?: string
	awsRegion?: string
	awsUseCrossRegionInference?: boolean
	awsUsePromptCache?: boolean
	awspromptCacheId?: string
	awsProfile?: string
	awsUseProfile?: boolean
	vertexProjectId?: string
	vertexRegion?: string
	openAiBaseUrl?: string
	openAiApiKey?: string
	openAiModelId?: string
	openAiCustomModelInfo?: ModelInfo
	openAiUseAzure?: boolean
	ollamaModelId?: string
	ollamaBaseUrl?: string
	lmStudioModelId?: string
	lmStudioBaseUrl?: string
	geminiApiKey?: string
	openAiNativeApiKey?: string
	mistralApiKey?: string
	azureApiVersion?: string
	openRouterUseMiddleOutTransform?: boolean
	openAiStreamingEnabled?: boolean
	setAzureApiVersion?: boolean
	deepSeekBaseUrl?: string
	deepSeekApiKey?: string
	includeMaxTokens?: boolean
	unboundApiKey?: string
	unboundModelId?: string
	azureAiEndpoint?: string
	azureAiKey?: string
	azureAiModelConfig?: ModelInfo
	azureAiDeployments?: {
		[key: string]: {
			name: string
			apiVersion: string
			modelMeshName?: string
		}
	}
}

export type ApiConfiguration = ApiHandlerOptions & {
	apiProvider?: ApiProvider
	id?: string // stable unique identifier
}

// Models
export interface ModelInfo {
	maxTokens?: number
	contextWindow: number
	supportsImages?: boolean
	supportsComputerUse?: boolean
	supportsPromptCache: boolean
	inputPrice?: number
	outputPrice?: number
	cacheWritesPrice?: number
	cacheReadsPrice?: number
	description?: string
	reasoningEffort?: "low" | "medium" | "high"
}

// Azure AI Model Inference Configuration
export interface AzureDeploymentConfig {
	name: string
	apiVersion: string // Azure AI Inference API version (e.g. 2024-05-01-preview)
	modelMeshName?: string // Model-Mesh deployment name if using Model-Mesh
}

// Azure OpenAI API Version
export const azureOpenAiDefaultApiVersion = "2024-08-01-preview"

// Azure AI Model Inference Defaults
export const azureAiModelInfoSaneDefaults: ModelInfo = {
	maxTokens: -1, // Dynamic based on model
	contextWindow: 128_000, // Conservative default
	supportsImages: true,
	supportsComputerUse: true,
	supportsPromptCache: false,
	inputPrice: 0,
	outputPrice: 0,
	description: "Azure AI Model Inference allows you to deploy and use any model through Azure's inference service.",
}

// Message content types
export interface MessageContent {
	type: "text" | "image" | "function_call" | "tool_use" | "tool_result" | "video"
	id?: string
	tool_use_id?: string
	text?: string
	image_url?: string
	function_call?: {
		name: string
		arguments: string
	}
	content?: Array<{ type?: string; text: string }>
	output?:
		| string
		| Array<{
				type?: string
				text?: string
				image?: { format: string; source: { bytes: Uint8Array } }
				[key: string]: any
		  }>
	input?: Record<string, any>
	name?: string
	source?: {
		data: string | Uint8Array
		media_type: string
		bytes?: Uint8Array
		uri?: string
		format?: string
	}
	s3Location?: {
		uri: string
		bucketOwner: string
	}
}

// Type guard for checking if an object has a 'type' property
export function hasType(obj: any): obj is { type: string } {
	return obj && typeof obj === "object" && "type" in obj
}

// Type guard for checking if an object has a 'text' property
export function hasText(obj: any): obj is { text: string } {
	return obj && typeof obj === "object" && "text" in obj
}

// OpenAI Native
export type OpenAiNativeModelId = string
export const openAiNativeModels: { [key in OpenAiNativeModelId]: ModelInfo } = {
	"gpt-4-turbo-preview": {
		contextWindow: 128000,
		supportsImages: true,
		supportsComputerUse: true,
		supportsPromptCache: false,
	},
}
export const openAiNativeDefaultModelId: OpenAiNativeModelId = "gpt-4-turbo-preview"

// Anthropic
export type AnthropicModelId = string
export const anthropicModels: { [key in AnthropicModelId]: ModelInfo } = {
	"claude-3-opus-20240229": {
		contextWindow: 200000,
		supportsImages: true,
		supportsComputerUse: true,
		supportsPromptCache: false,
	},
}
export const anthropicDefaultModelId: AnthropicModelId = "claude-3-opus-20240229"

// Bedrock
export type BedrockModelId = string
export const bedrockModels: { [key in BedrockModelId]: ModelInfo } = {
	"anthropic.claude-3-sonnet-20240229-v1:0": {
		contextWindow: 200000,
		supportsImages: true,
		supportsComputerUse: true,
		supportsPromptCache: false,
	},
}
export const bedrockDefaultModelId: BedrockModelId = "anthropic.claude-3-sonnet-20240229-v1:0"

// DeepSeek
export const deepSeekModels: { [key: string]: ModelInfo } = {
	"deepseek-coder": {
		contextWindow: 32768,
		supportsImages: false,
		supportsComputerUse: true,
		supportsPromptCache: false,
	},
}
export const deepSeekDefaultModelId = "deepseek-coder"

// Gemini
export type GeminiModelId = string
export const geminiModels: { [key in GeminiModelId]: ModelInfo } = {
	"gemini-pro": {
		contextWindow: 32768,
		supportsImages: false,
		supportsComputerUse: true,
		supportsPromptCache: false,
	},
}
export const geminiDefaultModelId: GeminiModelId = "gemini-pro"

// Glama
export const glamaDefaultModelId = "glama-base"
export const glamaDefaultModelInfo: ModelInfo = {
	contextWindow: 4096,
	supportsImages: false,
	supportsComputerUse: true,
	supportsPromptCache: false,
}

// OpenRouter
export const openRouterDefaultModelId = "openai/gpt-4-turbo-preview"
export const openRouterDefaultModelInfo: ModelInfo = {
	contextWindow: 128000,
	supportsImages: true,
	supportsComputerUse: true,
	supportsPromptCache: false,
}

// Default model info for OpenAI-compatible endpoints
export const openAiModelInfoSaneDefaults: ModelInfo = {
	contextWindow: 4096,
	supportsImages: false,
	supportsComputerUse: true,
	supportsPromptCache: false,
}

// Vertex
export type VertexModelId = string
export const vertexModels: { [key in VertexModelId]: ModelInfo } = {}
export const vertexDefaultModelId: VertexModelId = "gemini-pro"

// Mistral
export type MistralModelId = string
export const mistralModels: { [key in MistralModelId]: ModelInfo } = {
	"mistral-large-latest": {
		contextWindow: 32768,
		supportsImages: false,
		supportsComputerUse: true,
		supportsPromptCache: false,
	},
}
export const mistralDefaultModelId: MistralModelId = "mistral-large-latest"

// Unbound
export type UnboundModelId = string
export const unboundModels: { [key in UnboundModelId]: ModelInfo } = {
	"unbound-default": {
		contextWindow: 32768,
		supportsImages: false,
		supportsComputerUse: true,
		supportsPromptCache: false,
	},
}
export const unboundDefaultModelId: UnboundModelId = "unbound-default"
