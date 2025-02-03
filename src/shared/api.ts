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
