# Azure AI Inference Provider Implementation Plan

## Overview
This document outlines the implementation plan for adding Azure AI Inference support as a new provider in `src/api/providers/`. While Azure AI uses OpenAI's API format as a base, there are significant differences in implementation that need to be accounted for.

## Key Differences from OpenAI

### Endpoint Structure
- OpenAI: `https://api.openai.com/v1/chat/completions`
- Azure: `https://{resource-name}.openai.azure.com/openai/deployments/{deployment-name}/chat/completions?api-version={api-version}`

### Authentication
- OpenAI: Uses `Authorization: Bearer sk-...`
- Azure: Uses `api-key: {key}`

### Request Format
- OpenAI: Requires `model` field in request body
- Azure: Omits `model` from body (uses deployment name in URL instead)

### Special Considerations
- Required API version in URL query parameter
- Model-Mesh deployments require additional header: `x-ms-model-mesh-model-name`
- Different API versions for different features (e.g., 2023-12-01-preview, 2024-02-15-preview)

## Dependencies

```typescript
import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI, { AzureOpenAI } from "openai"
import {
  ApiHandlerOptions,
  ModelInfo,
  azureAiDefaultModelId,
  AzureAiModelId,
  azureAiModels
} from "../../shared/api"
import { ApiHandler, SingleCompletionHandler } from "../index"
import { convertToOpenAiMessages } from "../transform/openai-format"
import { ApiStream } from "../transform/stream"
```

## Configuration (shared/api.ts)

```typescript
export type AzureAiModelId = "gpt-35-turbo" | "gpt-4" | "gpt-4-turbo"

export interface AzureDeploymentConfig {
  name: string
  apiVersion: string
  modelMeshName?: string // For Model-Mesh deployments
}

export const azureAiModels: Record<AzureAiModelId, ModelInfo & { defaultDeployment: AzureDeploymentConfig }> = {
  "gpt-35-turbo": {
    maxTokens: 4096,
    contextWindow: 16385,
    supportsPromptCache: true,
    inputPrice: 0.0015,
    outputPrice: 0.002,
    defaultDeployment: {
      name: "gpt-35-turbo",
      apiVersion: "2024-02-15-preview"
    }
  },
  "gpt-4": {
    maxTokens: 8192,
    contextWindow: 8192,
    supportsPromptCache: true,
    inputPrice: 0.03,
    outputPrice: 0.06,
    defaultDeployment: {
      name: "gpt-4",
      apiVersion: "2024-02-15-preview"
    }
  },
  "gpt-4-turbo": {
    maxTokens: 4096,
    contextWindow: 128000,
    supportsPromptCache: true,
    inputPrice: 0.01,
    outputPrice: 0.03,
    defaultDeployment: {
      name: "gpt-4-turbo",
      apiVersion: "2024-02-15-preview"
    }
  }
}

export const azureAiDefaultModelId: AzureAiModelId = "gpt-35-turbo"
```

## Implementation (src/api/providers/azure-ai.ts)

```typescript
export class AzureAiHandler implements ApiHandler, SingleCompletionHandler {
  private options: ApiHandlerOptions
  private client: AzureOpenAI
  
  constructor(options: ApiHandlerOptions) {
    this.options = options
    
    if (!options.azureAiEndpoint) {
      throw new Error("Azure AI endpoint is required")
    }
    
    if (!options.azureAiKey) {
      throw new Error("Azure AI key is required") 
    }

    const deployment = this.getDeploymentConfig()
    
    this.client = new AzureOpenAI({
      apiKey: options.azureAiKey,
      endpoint: options.azureAiEndpoint,
      deployment: deployment.name,
      apiVersion: deployment.apiVersion,
      headers: deployment.modelMeshName ? {
        'x-ms-model-mesh-model-name': deployment.modelMeshName
      } : undefined
    })
  }
  
  private getDeploymentConfig(): AzureDeploymentConfig {
    const model = this.getModel()
    const defaultConfig = azureAiModels[model.id].defaultDeployment
    
    // Override with user-provided deployment names if available
    const deploymentName = 
      this.options.azureAiDeployments?.[model.id]?.name || 
      defaultConfig.name
    
    const apiVersion = 
      this.options.azureAiDeployments?.[model.id]?.apiVersion || 
      defaultConfig.apiVersion
      
    const modelMeshName = 
      this.options.azureAiDeployments?.[model.id]?.modelMeshName

    return {
      name: deploymentName,
      apiVersion,
      modelMeshName
    }
  }

  async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
    const modelInfo = this.getModel().info
    
    const systemMessage = {
      role: "system", 
      content: systemPrompt
    }
    
    // Note: model parameter is omitted as it's handled by deployment
    const requestOptions: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming, 'model'> = {
      messages: [systemMessage, ...convertToOpenAiMessages(messages)],
      temperature: 0,
      stream: true,
      max_tokens: modelInfo.maxTokens
    }

    try {
      const stream = await this.client.chat.completions.create(requestOptions as any)

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        
        if (delta?.content) {
          yield {
            type: "text",
            text: delta.content
          }
        }

        if (chunk.usage) {
          yield {
            type: "usage",
            inputTokens: chunk.usage.prompt_tokens || 0,
            outputTokens: chunk.usage.completion_tokens || 0
          }
        }
      }
    } catch (error) {
      // Handle Azure-specific error format
      if (error instanceof Error) {
        const azureError = error as any
        throw new Error(
          `Azure AI error (${azureError.code || 'Unknown'}): ${azureError.message}`
        )
      }
      throw error
    }
  }

  getModel(): { id: AzureAiModelId; info: ModelInfo } {
    const modelId = this.options.apiModelId
    if (modelId && modelId in azureAiModels) {
      const id = modelId as AzureAiModelId
      return { id, info: azureAiModels[id] }
    }
    return { id: azureAiDefaultModelId, info: azureAiModels[azureAiDefaultModelId] }
  }

  async completePrompt(prompt: string): Promise<string> {
    try {
      // Note: model parameter is omitted as it's handled by deployment
      const response = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      } as any)
      
      return response.choices[0]?.message.content || ""
    } catch (error) {
      // Handle Azure-specific error format
      if (error instanceof Error) {
        const azureError = error as any
        throw new Error(
          `Azure AI completion error (${azureError.code || 'Unknown'}): ${azureError.message}`
        )
      }
      throw error
    }
  }
}
```

## Required Updates to ApiHandlerOptions

Add to ApiHandlerOptions interface in shared/api.ts:

```typescript
azureAiEndpoint?: string
azureAiKey?: string
azureAiDeployments?: {
  [key in AzureAiModelId]?: {
    name: string
    apiVersion: string
    modelMeshName?: string
  }
}
```

## Testing Plan

1. Create __tests__ directory with azure-ai.test.ts:
   ```typescript
   describe('AzureAiHandler', () => {
     // Test URL construction
     test('constructs correct Azure endpoint URL', () => {})
     
     // Test authentication
     test('sets correct authentication headers', () => {})
     
     // Test deployment configuration
     test('uses correct deployment names', () => {})
     test('handles Model-Mesh configuration', () => {})
     
     // Test error handling
     test('handles Azure-specific error format', () => {})
     
     // Test request/response format
     test('omits model from request body', () => {})
     test('handles Azure response format', () => {})
   })
   ```

## Integration Steps

1. Add Azure AI models and types to shared/api.ts
2. Create azure-ai.ts provider implementation
3. Add provider tests
4. Update API handler options
5. Add deployment configuration support
6. Implement Azure-specific error handling
7. Test with real Azure AI endpoints

## Error Handling

Azure returns errors in a specific format:
```typescript
interface AzureError {
  code: string        // e.g., "InternalServerError", "InvalidRequest"
  message: string
  target?: string
  details?: Array<{
    code: string
    message: string
  }>
}
```

Implementation should:
- Parse Azure error format
- Include error codes in messages
- Handle deployment-specific errors
- Provide clear upgrade paths for API version issues

## Documentation Updates

1. Add Azure AI configuration section to README.md:
   - Endpoint configuration
   - Authentication setup
   - Deployment mapping
   - API version selection
   - Model-Mesh support

2. Document configuration examples:
   ```typescript
   {
     azureAiEndpoint: "https://your-resource.openai.azure.com",
     azureAiKey: "your-api-key",
     azureAiDeployments: {
       "gpt-4": {
         name: "your-gpt4-deployment",
         apiVersion: "2024-02-15-preview",
         modelMeshName: "optional-model-mesh-name"
       }
     }
   }
   ```

## Future Improvements

1. Support for Azure-specific features:
   - Fine-tuning endpoints
   - Custom deployment configurations
   - Managed identity authentication

2. Performance optimizations:
   - Connection pooling
   - Regional endpoint selection
   - Automatic API version negotiation

3. Advanced features:
   - Response format control
   - Function calling support
   - Vision model support