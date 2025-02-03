import { ApiConfiguration, ApiProvider } from "./api"
import { Mode, PromptComponent, ModeConfig } from "./modes"

export type PromptMode = Mode | "enhance"

export type AudioType = "notification" | "celebration" | "progress_loop"

export interface WebviewMessage {
	type:
		| "apiConfiguration"
		| "currentApiConfigName"
		| "upsertApiConfiguration"
		| "deleteApiConfiguration"
		| "loadApiConfiguration"
		| "renameApiConfiguration"
		| "getListApiConfiguration"
		| "customInstructions"
		| "allowedCommands"
		| "alwaysAllowReadOnly"
		| "alwaysAllowWrite"
		| "alwaysAllowExecute"
		| "alwaysAllowBrowser"
		| "alwaysAllowMcp"
		| "alwaysAllowModeSwitch"
		| "webviewDidLaunch"
		| "newTask"
		| "askResponse"
		| "clearTask"
		| "didShowAnnouncement"
		| "selectImages"
		| "exportCurrentTask"
		| "showTaskWithId"
		| "deleteTaskWithId"
		| "exportTaskWithId"
		| "resetState"
		| "requestOllamaModels"
		| "requestLmStudioModels"
		| "openImage"
		| "openFile"
		| "openMention"
		| "cancelTask"
		| "refreshGlamaModels"
		| "refreshOpenRouterModels"
		| "refreshOpenAiModels"
		| "refreshAzureAiModels"
		| "alwaysAllowBrowser"
		| "alwaysAllowMcp"
		| "alwaysAllowModeSwitch"
		| "playSound"
		| "soundEnabled"
		| "soundVolume"
		| "diffEnabled"
		| "browserViewportSize"
		| "screenshotQuality"
		| "openMcpSettings"
		| "restartMcpServer"
		| "toggleToolAlwaysAllow"
		| "toggleMcpServer"
		| "updateMcpTimeout"
		| "fuzzyMatchThreshold"
		| "preferredLanguage"
		| "writeDelayMs"
		| "enhancePrompt"
		| "enhancedPrompt"
		| "draggedImages"
		| "deleteMessage"
		| "terminalOutputLineLimit"
		| "mcpEnabled"
		| "enableMcpServerCreation"
		| "searchCommits"
		| "refreshGlamaModels"
		| "alwaysApproveResubmit"
		| "requestDelaySeconds"
		| "rateLimitSeconds"
		| "setApiConfigPassword"
		| "requestVsCodeLmModels"
		| "mode"
		| "updatePrompt"
		| "updateSupportPrompt"
		| "resetSupportPrompt"
		| "getSystemPrompt"
		| "systemPrompt"
		| "enhancementApiConfigId"
		| "updateExperimental"
		| "autoApprovalEnabled"
		| "updateCustomMode"
		| "deleteCustomMode"
		| "setopenAiCustomModelInfo"
		| "openCustomModesSettings"
		| "updateAzureAiDeployment"
	text?: string
	disabled?: boolean
	askResponse?: ClineAskResponse
	apiConfiguration?: ApiConfiguration
	images?: string[]
	bool?: boolean
	value?: number
	commands?: string[]
	audioType?: AudioType
	serverName?: string
	toolName?: string
	alwaysAllow?: boolean
	mode?: Mode
	promptMode?: PromptMode
	customPrompt?: PromptComponent
	dataUrls?: string[]
	values?: Record<string, any>
	query?: string
	slug?: string
	modeConfig?: ModeConfig
	timeout?: number
	azureAiDeployment?: {
		modelId: string
		name: string
		apiVersion: string
		modelMeshName?: string
	}
}

export type ClineAskResponse = "yesButtonClicked" | "noButtonClicked" | "messageResponse"
