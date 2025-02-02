import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { memo } from "react"
import { useExtensionState } from "../../context/ExtensionStateContext"

const AzureAiModelPicker: React.FC = () => {
	const { apiConfiguration, handleInputChange } = useExtensionState()

	return (
		<>
			<VSCodeTextField
				value={apiConfiguration?.azureAiEndpoint || ""}
				style={{ width: "100%" }}
				type="url"
				onInput={handleInputChange("azureAiEndpoint")}
				placeholder="https://ai-services-resource.services.ai.azure.com/models">
				<span style={{ fontWeight: 500 }}>Azure AI Endpoint</span>
			</VSCodeTextField>

			<VSCodeTextField
				value={apiConfiguration?.azureAiKey || ""}
				style={{ width: "100%" }}
				type="password"
				onInput={handleInputChange("azureAiKey")}
				placeholder="Enter API Key...">
				<span style={{ fontWeight: 500 }}>Azure AI Key</span>
			</VSCodeTextField>

			<VSCodeTextField
				value={apiConfiguration?.apiModelId || ""}
				style={{ width: "100%" }}
				type="text"
				onInput={handleInputChange("apiModelId")}
				placeholder="Enter model deployment name...">
				<span style={{ fontWeight: 500 }}>Deployment Name</span>
			</VSCodeTextField>

			<p
				style={{
					fontSize: "12px",
					marginTop: "5px",
					color: "var(--vscode-descriptionForeground)",
				}}>
				Configure your Azure AI Model Inference endpoint and model deployment. The API key is stored locally.
				{!apiConfiguration?.azureAiKey && (
					<VSCodeLink
						href="https://learn.microsoft.com/azure/ai-foundry/model-inference/reference/reference-model-inference-chat-completions"
						style={{ display: "inline", fontSize: "inherit" }}>
						{" "}
						Learn more about Azure AI Model Inference endpoints.
					</VSCodeLink>
				)}
			</p>
		</>
	)
}

export default memo(AzureAiModelPicker)
