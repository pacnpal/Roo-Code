import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { memo } from "react"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { Pane } from "vscrui"
import { azureAiModelInfoSaneDefaults } from "../../../../src/shared/api"

const AzureAiModelPicker: React.FC = () => {
	const { apiConfiguration, handleInputChange } = useExtensionState()

	return (
		<div style={{ display: "flex", flexDirection: "column", rowGap: "5px" }}>
			<VSCodeTextField
				value={apiConfiguration?.azureAiEndpoint || ""}
				style={{ width: "100%" }}
				type="url"
				onChange={handleInputChange("azureAiEndpoint")}
				placeholder="https://your-endpoint.region.inference.ai.azure.com">
				<span style={{ fontWeight: 500 }}>Base URL</span>
			</VSCodeTextField>

			<VSCodeTextField
				value={apiConfiguration?.azureAiKey || ""}
				style={{ width: "100%" }}
				type="password"
				onChange={handleInputChange("azureAiKey")}
				placeholder="Enter API Key...">
				<span style={{ fontWeight: 500 }}>API Key</span>
			</VSCodeTextField>

			<VSCodeTextField
				value={apiConfiguration?.apiModelId || ""}
				style={{ width: "100%" }}
				type="text"
				onChange={handleInputChange("apiModelId")}
				placeholder="Enter model deployment name...">
				<span style={{ fontWeight: 500 }}>Model Deployment Name</span>
			</VSCodeTextField>

			<Pane
				title="Model Configuration"
				open={false}
				actions={[
					{
						iconName: "refresh",
						onClick: () =>
							handleInputChange("openAiCustomModelInfo")({
								target: { value: azureAiModelInfoSaneDefaults },
							}),
					},
				]}>
				<div
					style={{
						padding: 15,
						backgroundColor: "var(--vscode-editor-background)",
					}}>
					<p
						style={{
							fontSize: "12px",
							color: "var(--vscode-descriptionForeground)",
							margin: "0 0 15px 0",
							lineHeight: "1.4",
						}}>
						Configure capabilities for your deployed model.
					</p>

					<div
						style={{
							backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)",
							padding: "12px",
							borderRadius: "4px",
							marginTop: "8px",
						}}>
						<span
							style={{
								fontSize: "11px",
								fontWeight: 500,
								color: "var(--vscode-editor-foreground)",
								display: "block",
								marginBottom: "10px",
							}}>
							Model Features
						</span>

						<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
							<VSCodeTextField
								value={
									apiConfiguration?.openAiCustomModelInfo?.contextWindow?.toString() ||
									azureAiModelInfoSaneDefaults.contextWindow?.toString() ||
									""
								}
								type="text"
								style={{ width: "100%" }}
								onChange={(e: any) => {
									const parsed = parseInt(e.target.value)
									handleInputChange("openAiCustomModelInfo")({
										target: {
											value: {
												...(apiConfiguration?.openAiCustomModelInfo ||
													azureAiModelInfoSaneDefaults),
												contextWindow:
													e.target.value === ""
														? undefined
														: isNaN(parsed)
															? azureAiModelInfoSaneDefaults.contextWindow
															: parsed,
											},
										},
									})
								}}
								placeholder="e.g. 128000">
								<span style={{ fontWeight: 500 }}>Context Window Size</span>
							</VSCodeTextField>
							<p
								style={{
									fontSize: "11px",
									color: "var(--vscode-descriptionForeground)",
									marginTop: "4px",
								}}>
								Total tokens the model can process in a single request.
							</p>
						</div>
					</div>
				</div>
			</Pane>

			<p
				style={{
					fontSize: "12px",
					marginTop: "5px",
					color: "var(--vscode-descriptionForeground)",
				}}>
				Configure your Azure AI Model Inference endpoint and model deployment. API keys are stored locally.
				{!apiConfiguration?.azureAiKey && (
					<VSCodeLink
						href="https://learn.microsoft.com/azure/ai-foundry/model-inference/reference/reference-model-inference-chat-completions"
						style={{ display: "inline", fontSize: "inherit" }}>
						{" "}
						Learn more about Azure AI Model Inference.
					</VSCodeLink>
				)}
			</p>
		</div>
	)
}

export default memo(AzureAiModelPicker)
