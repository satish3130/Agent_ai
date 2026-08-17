import { createOpenAI } from '@ai-sdk/openai';
import dotenv from 'dotenv';
dotenv.config();
/**
 * Returns a configured model instance compatible with Mastra AI.
 * Configurable via environment variables (MODEL_PROVIDER = zhipu | openrouter | custom).
 */
export function getZaiModel(requestedModelId = 'nvidia/nemotron-3.5-lightning:free') {
    const provider = (process.env.MODEL_PROVIDER || 'zhipu').toLowerCase();
    if (provider === 'openrouter') {
        const openrouterKey = process.env.OPENROUTER_API_KEY;
        if (!openrouterKey) {
            console.warn('⚠️ Warning: OPENROUTER_API_KEY is missing in .env');
        }
        const openrouterClient = createOpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: openrouterKey || 'dummy-key',
        });
        console.log(`[Mastra Model Provider] Configured OpenRouter model: ${requestedModelId}`);
        return openrouterClient(requestedModelId);
    }
    if (provider === 'custom') {
        const baseURL = process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1';
        const apiKey = process.env.OPENAI_API_KEY || 'dummy-key';
        const customClient = createOpenAI({
            baseURL,
            apiKey,
        });
        console.log(`[Mastra Model Provider] Configured Custom OpenAI-compatible endpoint: ${baseURL} (${requestedModelId})`);
        return customClient(requestedModelId);
    }
    // Default: Direct Zhipu AI / Z.ai PaaS Endpoint
    const apiKey = process.env.ZHIPU_API_KEY || process.env.ZAI_API_KEY || '';
    const baseURL = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    if (!apiKey) {
        console.warn('⚠️ Warning: ZHIPU_API_KEY is missing in .env. Please add your key or set MODEL_PROVIDER=openrouter');
    }
    const zhipuClient = createOpenAI({
        baseURL,
        apiKey,
    });
    const modelId = requestedModelId.includes('/') ? requestedModelId.split('/')[1] : requestedModelId;
    console.log(`[Mastra Model Provider] Configured Zhipu AI (Z.ai) model: ${modelId} @ ${baseURL}`);
    return zhipuClient(modelId);
}
