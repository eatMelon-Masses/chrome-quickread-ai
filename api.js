// QuickRead AI Unified API Client

class QuickReadAPI {
    constructor() {
        this.providers = {
            openai: {
                baseURL: 'https://api.openai.com/v1',
                models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo']
            },
            qwen: {
                baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                models: ['qwen-plus', 'qwen-max', 'qwen-turbo']
            },
            deepseek: {
                baseURL: 'https://api.deepseek.com/v1',
                models: ['deepseek-chat', 'deepseek-coder']
            }
        };
    }
    
    async getConfiguration() {
        const result = await chrome.storage.local.get(['provider', 'apiKey', 'model', 'baseUrl']);
        
        // If custom provider with custom baseUrl, use it
        if (result.provider === 'custom' && result.baseUrl) {
            return {
                provider: result.provider,
                apiKey: result.apiKey,
                model: result.model,
                baseUrl: result.baseUrl
            };
        }
        
        // Otherwise use predefined provider base URL
        const provider = result.provider || 'openai';
        const providerInfo = this.providers[provider];
        
        return {
            provider: provider,
            apiKey: result.apiKey,
            model: result.model || 'gpt-4o-mini',
            baseUrl: result.baseUrl || providerInfo?.baseURL || 'https://api.openai.com/v1'
        };
    }
    
    async generateSummary(content, mode, customPrompt = null) {
        const config = await this.getConfiguration();
        
        if (!config.apiKey) {
            throw new Error('API Key 未配置');
        }
        
        const prompt = customPrompt || this.getIntentPrompt(mode);
        
        // Truncate content if too long (max ~50k chars for most models)
        const truncatedContent = this.truncateContent(content, 48000);
        
        const messages = [
            { role: 'system', content: prompt },
            { role: 'user', content: truncatedContent }
        ];
        
        const response = await this.callLLM(
            config.baseUrl,
            config.apiKey,
            config.model,
            messages
        );
        
        return response.choices[0].message.content;
    }
    
    getIntentPrompt(mode) {
        const prompts = {
            quick: '你是一个信息提取助手。请从以下文章中提取 3-5 个核心要点，并在最后用一句话总结。保持客观，每个要点不超过 30 字。',
            learn: '你是一个知识整理助手。请识别文章中的核心概念和知识框架，结构化呈现。解释关键术语，指出逻辑关系。',
            decide: '你是一个决策分析助手。请从文章中提取对决策有用的信息：优缺点对比、关键数据、风险提示。'
        };
        
        return prompts[mode] || prompts.quick;
    }
    
    truncateContent(content, maxLength) {
        if (content.length <= maxLength) {
            return content;
        }
        
        // Try to truncate at a sentence boundary
        const truncated = content.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastExclamation = truncated.lastIndexOf('!');
        const lastQuestion = truncated.lastIndexOf('?');
        
        const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
        
        if (lastSentenceEnd > maxLength * 0.8) {
            return content.substring(0, lastSentenceEnd + 1) + '...';
        }
        
        return truncated + '...';
    }
    
    async callLLM(baseURL, apiKey, model, messages, maxRetries = 2) {
        const url = `${baseURL}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
        
        const body = JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000
        });
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: body,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
                    
                    if (response.status === 429) {
                        throw new Error('API 额度不足，请充值或换 Key');
                    } else if (response.status === 401) {
                        throw new Error('API Key 无效，请检查或更换');
                    } else if (response.status >= 500) {
                        if (attempt < maxRetries) {
                            // Retry on server errors
                            await this.delay(1000 * (attempt + 1)); // Exponential backoff
                            continue;
                        }
                        throw new Error('服务器错误，请稍后重试');
                    } else {
                        throw new Error(errorMessage);
                    }
                }
                
                const data = await response.json();
                return data;
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    if (attempt < maxRetries) {
                        await this.delay(2000); // Wait before retrying timeout
                        continue;
                    }
                    throw new Error('请求超时，请重试');
                }
                
                // Re-throw other errors
                throw error;
            }
        }
        
        throw new Error('请求失败，请检查网络连接');
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create global instance
const quickReadAPI = new QuickReadAPI();