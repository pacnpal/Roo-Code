import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { Fzf } from "fzf"
import React, { KeyboardEvent, memo, useEffect, useMemo, useRef, useState } from "react"
import debounce from "debounce"
import { useExtensionState } from "../../context/ExtensionStateContext"
import { vscode } from "../../utils/vscode"
import { highlightFzfMatch } from "../../utils/highlight"
import { Pane } from "vscrui"
import { azureAiModelInfoSaneDefaults } from "../../../../src/shared/api"
import styled from "styled-components"

const AzureAiModelPicker: React.FC = () => {
	const { apiConfiguration, setApiConfiguration, azureAiModels, onUpdateApiConfig } = useExtensionState()
	const [searchTerm, setSearchTerm] = useState(apiConfiguration?.apiModelId || "")
	const [isDropdownVisible, setIsDropdownVisible] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const itemRefs = useRef<(HTMLDivElement | null)[]>([])
	const dropdownListRef = useRef<HTMLDivElement>(null)

	const handleModelChange = (newModelId: string) => {
		const apiConfig = {
			...apiConfiguration,
			apiModelId: newModelId,
		}
		setApiConfiguration(apiConfig)
		onUpdateApiConfig(apiConfig)
		setSearchTerm(newModelId)
	}

	useEffect(() => {
		if (apiConfiguration?.apiModelId && apiConfiguration?.apiModelId !== searchTerm) {
			setSearchTerm(apiConfiguration?.apiModelId)
		}
	}, [apiConfiguration, searchTerm])

	const debouncedRefreshModels = useMemo(
		() =>
			debounce((endpoint: string, key: string) => {
				vscode.postMessage({
					type: "refreshAzureAiModels",
					values: {
						endpoint,
						key,
					},
				})
			}, 50),
		[],
	)

	useEffect(() => {
		if (!apiConfiguration?.azureAiEndpoint || !apiConfiguration?.azureAiKey) {
			return
		}

		debouncedRefreshModels(apiConfiguration.azureAiEndpoint, apiConfiguration.azureAiKey)

		return () => {
			debouncedRefreshModels.clear()
		}
	}, [apiConfiguration?.azureAiEndpoint, apiConfiguration?.azureAiKey, debouncedRefreshModels])

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsDropdownVisible(false)
			}
		}

		document.addEventListener("mousedown", handleClickOutside)
		return () => {
			document.removeEventListener("mousedown", handleClickOutside)
		}
	}, [])

	const modelIds = useMemo(() => {
		return azureAiModels.sort((a, b) => a.localeCompare(b))
	}, [azureAiModels])

	const searchableItems = useMemo(() => {
		return modelIds.map((id) => ({
			id,
			html: id,
		}))
	}, [modelIds])

	const fzf = useMemo(() => {
		return new Fzf(searchableItems, {
			selector: (item) => item.html,
		})
	}, [searchableItems])

	const modelSearchResults = useMemo(() => {
		if (!searchTerm) return searchableItems

		const searchResults = fzf.find(searchTerm)
		return searchResults.map((result) => ({
			...result.item,
			html: highlightFzfMatch(result.item.html, Array.from(result.positions), "model-item-highlight"),
		}))
	}, [searchableItems, searchTerm, fzf])

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (!isDropdownVisible) return

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault()
				setSelectedIndex((prev) => (prev < modelSearchResults.length - 1 ? prev + 1 : prev))
				break
			case "ArrowUp":
				event.preventDefault()
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev))
				break
			case "Enter":
				event.preventDefault()
				if (selectedIndex >= 0 && selectedIndex < modelSearchResults.length) {
					handleModelChange(modelSearchResults[selectedIndex].id)
					setIsDropdownVisible(false)
				}
				break
			case "Escape":
				setIsDropdownVisible(false)
				setSelectedIndex(-1)
				break
		}
	}

	useEffect(() => {
		setSelectedIndex(-1)
		if (dropdownListRef.current) {
			dropdownListRef.current.scrollTop = 0
		}
	}, [searchTerm])

	useEffect(() => {
		if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
			itemRefs.current[selectedIndex]?.scrollIntoView({
				block: "nearest",
				behavior: "smooth",
			})
		}
	}, [selectedIndex])

	return (
		<>
			<style>
				{`
        .model-item-highlight {
          background-color: var(--vscode-editor-findMatchHighlightBackground);
          color: inherit;
        }
        `}
			</style>
			<div style={{ display: "flex", flexDirection: "column", rowGap: "5px" }}>
				<VSCodeTextField
					value={apiConfiguration?.azureAiEndpoint || ""}
					style={{ width: "100%" }}
					type="url"
					onChange={(e) => {
						const apiConfig = {
							...apiConfiguration,
							azureAiEndpoint: (e.target as HTMLInputElement).value,
						}
						setApiConfiguration(apiConfig)
						onUpdateApiConfig(apiConfig)
					}}
					placeholder="https://your-endpoint.region.inference.ai.azure.com">
					<span style={{ fontWeight: 500 }}>Base URL</span>
				</VSCodeTextField>

				<VSCodeTextField
					value={apiConfiguration?.azureAiKey || ""}
					style={{ width: "100%" }}
					type="password"
					onChange={(e) => {
						const apiConfig = {
							...apiConfiguration,
							azureAiKey: (e.target as HTMLInputElement).value,
						}
						setApiConfiguration(apiConfig)
						onUpdateApiConfig(apiConfig)
					}}
					placeholder="Enter API Key...">
					<span style={{ fontWeight: 500 }}>API Key</span>
				</VSCodeTextField>

				<DropdownWrapper ref={dropdownRef}>
					<VSCodeTextField
						id="model-search"
						placeholder="Search and select a model..."
						value={searchTerm}
						onInput={(e) => {
							handleModelChange((e.target as HTMLInputElement)?.value)
							setIsDropdownVisible(true)
						}}
						onFocus={() => setIsDropdownVisible(true)}
						onKeyDown={handleKeyDown}
						style={{ width: "100%", zIndex: AZURE_MODEL_PICKER_Z_INDEX, position: "relative" }}>
						<span style={{ fontWeight: 500 }}>Model Deployment Name</span>
						{searchTerm && (
							<div
								className="input-icon-button codicon codicon-close"
								aria-label="Clear search"
								onClick={() => {
									handleModelChange("")
									setIsDropdownVisible(true)
								}}
								slot="end"
								style={{
									display: "flex",
									justifyContent: "center",
									alignItems: "center",
									height: "100%",
								}}
							/>
						)}
					</VSCodeTextField>
					{isDropdownVisible && (
						<DropdownList ref={dropdownListRef}>
							{modelSearchResults.map((item, index) => (
								<DropdownItem
									key={item.id}
									ref={(el) => (itemRefs.current[index] = el)}
									isSelected={index === selectedIndex}
									onMouseEnter={() => setSelectedIndex(index)}
									onClick={() => {
										handleModelChange(item.id)
										setIsDropdownVisible(false)
									}}
									dangerouslySetInnerHTML={{
										__html: item.html,
									}}
								/>
							))}
						</DropdownList>
					)}
				</DropdownWrapper>

				<Pane
					title="Model Configuration"
					open={false}
					actions={[
						{
							iconName: "refresh",
							onClick: () => {
								const apiConfig = {
									...apiConfiguration,
									azureAiModelConfig: azureAiModelInfoSaneDefaults,
								}
								setApiConfiguration(apiConfig)
								onUpdateApiConfig(apiConfig)
							},
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
										apiConfiguration?.azureAiModelConfig?.contextWindow?.toString() ||
										azureAiModelInfoSaneDefaults.contextWindow?.toString() ||
										""
									}
									type="text"
									style={{ width: "100%" }}
									onChange={(e: any) => {
										const parsed = parseInt(e.target.value)
										const apiConfig = {
											...apiConfiguration,
											azureAiModelConfig: {
												...(apiConfiguration?.azureAiModelConfig ||
													azureAiModelInfoSaneDefaults),
												contextWindow:
													e.target.value === ""
														? undefined
														: isNaN(parsed)
															? azureAiModelInfoSaneDefaults.contextWindow
															: parsed,
											},
										}
										setApiConfiguration(apiConfig)
										onUpdateApiConfig(apiConfig)
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
		</>
	)
}

export default memo(AzureAiModelPicker)

// Dropdown

const DropdownWrapper = styled.div`
	position: relative;
	width: 100%;
`

export const AZURE_MODEL_PICKER_Z_INDEX = 1_000

const DropdownList = styled.div`
	position: absolute;
	top: calc(100% - 3px);
	left: 0;
	width: calc(100% - 2px);
	max-height: 200px;
	overflow-y: auto;
	background-color: var(--vscode-dropdown-background);
	border: 1px solid var(--vscode-list-activeSelectionBackground);
	z-index: ${AZURE_MODEL_PICKER_Z_INDEX - 1};
	border-bottom-left-radius: 3px;
	border-bottom-right-radius: 3px;
`

const DropdownItem = styled.div<{ isSelected: boolean }>`
	padding: 5px 10px;
	cursor: pointer;
	word-break: break-all;
	white-space: normal;

	background-color: ${({ isSelected }) => (isSelected ? "var(--vscode-list-activeSelectionBackground)" : "inherit")};

	&:hover {
		background-color: var(--vscode-list-activeSelectionBackground);
	}
`
