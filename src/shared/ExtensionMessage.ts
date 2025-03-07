import { ApiConfiguration, ApiProvider, ModelInfo, AzureDeploymentConfig } from "./api"
import { HistoryItem } from "./HistoryItem"
import { McpServer } from "./mcp"
import { GitCommit } from "../utils/git"
import { Mode, CustomModePrompts, ModeConfig } from "./modes"
import { CustomSupportPrompts } from "./support-prompt"
import { ExperimentId } from "./experiments"

export interface LanguageModelChatSelector {
  vendor?: string
  family?: string
  version?: string
  id?: string
}

export interface ExtensionMessage {
  type:
    | "action"
    | "state"
    | "selectedImages"
    | "ollamaModels"
    | "lmStudioModels"
    | "theme"
    | "workspaceUpdated"
    | "invoke"
    | "partialMessage"
    | "glamaModels"
    | "openRouterModels"
    | "openAiModels"
    | "mcpServers"
    | "enhancedPrompt"
    | "commitSearchResults"
    | "listApiConfig"
    | "vsCodeLmModels"
    | "vsCodeLmApiAvailable"
    | "requestVsCodeLmModels"
    | "updatePrompt"
    | "systemPrompt"
    | "autoApprovalEnabled"
    | "updateCustomMode"
    | "deleteCustomMode"
  text?: string
  action?:
    | "chatButtonClicked"
    | "mcpButtonClicked"
    | "settingsButtonClicked"
    | "historyButtonClicked"
    | "promptsButtonClicked"
    | "didBecomeVisible"
  invoke?: "sendMessage" | "primaryButtonClick" | "secondaryButtonClick" | "setChatBoxMessage"
  state?: ExtensionState
  images?: string[]
  ollamaModels?: string[]
  lmStudioModels?: string[]
  vsCodeLmModels?: { vendor?: string; family?: string; version?: string; id?: string }[]
  filePaths?: string[]
  openedTabs?: Array<{
    label: string
    isActive: boolean
    path?: string
  }>
  partialMessage?: ClineMessage
  glamaModels?: Record<string, ModelInfo>
  openRouterModels?: Record<string, ModelInfo>
  openAiModels?: string[]
  mcpServers?: McpServer[]
  commits?: GitCommit[]
  listApiConfig?: ApiConfigMeta[]
  mode?: Mode
  customMode?: ModeConfig
  slug?: string
}

export interface ApiConfigMeta {
  id: string
  name: string
  apiProvider?: ApiProvider
}

export interface ExtensionState {
  version: string
  clineMessages: ClineMessage[]
  taskHistory: HistoryItem[]
  shouldShowAnnouncement: boolean
  apiConfiguration?: ApiConfiguration
  currentApiConfigName?: string
  listApiConfigMeta?: ApiConfigMeta[]
  customInstructions?: string
  customModePrompts?: CustomModePrompts
  customSupportPrompts?: CustomSupportPrompts
  alwaysAllowReadOnly?: boolean
  alwaysAllowWrite?: boolean
  alwaysAllowExecute?: boolean
  alwaysAllowBrowser?: boolean
  alwaysAllowMcp?: boolean
  alwaysApproveResubmit?: boolean
  alwaysAllowModeSwitch?: boolean
  requestDelaySeconds: number
  rateLimitSeconds: number
  uriScheme?: string
  allowedCommands?: string[]
  soundEnabled?: boolean
  soundVolume?: number
  diffEnabled?: boolean
  browserViewportSize?: string
  screenshotQuality?: number
  fuzzyMatchThreshold?: number
  preferredLanguage: string
  writeDelayMs: number
  terminalOutputLineLimit?: number
  mcpEnabled: boolean
  enableMcpServerCreation: boolean
  mode: Mode
  modeApiConfigs?: Record<Mode, string>
  enhancementApiConfigId?: string
  experiments: Record<ExperimentId, boolean>
  autoApprovalEnabled?: boolean
  customModes: ModeConfig[]
  toolRequirements?: Record<string, boolean>
  azureAiDeployments?: Record<string, AzureDeploymentConfig>
}

export interface ClineMessage {
  ts: number
  type: "ask" | "say"
  ask?: ClineAsk
  say?: ClineSay
  text?: string
  images?: string[]
  partial?: boolean
  reasoning?: string
}

export type ClineAsk =
  | "followup"
  | "command"
  | "command_output"
  | "completion_result"
  | "tool"
  | "api_req_failed"
  | "resume_task"
  | "resume_completed_task"
  | "mistake_limit_reached"
  | "browser_action_launch"
  | "use_mcp_server"

export type ClineSay =
  | "task"
  | "error"
  | "api_req_started"
  | "api_req_finished"
  | "text"
  | "reasoning"
  | "completion_result"
  | "user_feedback"
  | "user_feedback_diff"
  | "api_req_retried"
  | "api_req_retry_delayed"
  | "command_output"
  | "tool"
  | "shell_integration_warning"
  | "browser_action"
  | "browser_action_result"
  | "command"
  | "mcp_server_request_started"
  | "mcp_server_response"
  | "new_task_started"
  | "new_task"

export interface ClineSayTool {
  tool:
    | "editedExistingFile"
    | "appliedDiff"
    | "newFileCreated"
    | "readFile"
    | "listFilesTopLevel"
    | "listFilesRecursive"
    | "listCodeDefinitionNames"
    | "searchFiles"
    | "switchMode"
    | "newTask"
  path?: string
  diff?: string
  content?: string
  regex?: string
  filePattern?: string
  mode?: string
  reason?: string
}

export const browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"] as const
export type BrowserAction = (typeof browserActions)[number]

export interface ClineSayBrowserAction {
  action: BrowserAction
  coordinate?: string
  text?: string
}

export type BrowserActionResult = {
  screenshot?: string
  logs?: string
  currentUrl?: string
  currentMousePosition?: string
}

export interface ClineAskUseMcpServer {
  serverName: string
  type: "use_mcp_tool" | "access_mcp_resource"
  toolName?: string
  arguments?: string
  uri?: string
}

export interface ClineApiReqInfo {
  request?: string
  tokensIn?: number
  tokensOut?: number
  cacheWrites?: number
  cacheReads?: number
  cost?: number
  cancelReason?: ClineApiReqCancelReason
  streamingFailedMessage?: string
}

export type ClineApiReqCancelReason = "streaming_failed" | "user_cancelled"
