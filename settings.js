// QuickRead AI Settings Script

// Providers visible in the store-friendly首发 version.
// Other provider definitions are kept below for future use — just add them to this set.
const VISIBLE_PROVIDERS = new Set(['openai', 'anthropic', 'gemini', 'custom']);

class QuickReadSettings {
    constructor() {
        this.providers = {
            openai: {
                name: 'OpenAI',
                baseURL: 'https://api.openai.com/v1',
                defaultModel: 'gpt-5.5',
                getKeyUrl: 'https://platform.openai.com/api-keys',
                models: [
                    ['gpt-5.5', 'GPT-5.5 · 最新旗舰'],
                    ['gpt-5.4', 'GPT-5.4 · 高能力'],
                    ['gpt-5.4-mini', 'GPT-5.4 mini · 性价比'],
                    ['gpt-5.4-nano', 'GPT-5.4 nano · 低成本'],
                    ['gpt-5.2', 'GPT-5.2'],
                    ['gpt-5.1', 'GPT-5.1'],
                    ['gpt-5', 'GPT-5'],
                    ['gpt-5-mini', 'GPT-5 mini'],
                    ['gpt-5-nano', 'GPT-5 nano'],
                    ['gpt-4.1', 'GPT-4.1'],
                    ['gpt-4.1-mini', 'GPT-4.1 mini'],
                    ['gpt-4o', 'GPT-4o'],
                    ['gpt-4o-mini', 'GPT-4o mini'],
                    ['o4-mini', 'o4-mini · 推理']
                ]
            },
            anthropic: {
                name: 'Claude',
                baseURL: 'https://api.anthropic.com/v1',
                defaultModel: 'claude-sonnet-4-6',
                getKeyUrl: 'https://platform.claude.com/settings/keys',
                models: [
                    ['claude-opus-4-8', 'Claude Opus 4.8 · 最强'],
                    ['claude-opus-4-7', 'Claude Opus 4.7'],
                    ['claude-sonnet-4-6', 'Claude Sonnet 4.6 · 均衡'],
                    ['claude-haiku-4-5', 'Claude Haiku 4.5 · 快速'],
                    ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5 snapshot']
                ]
            },
            gemini: {
                name: 'Google Gemini',
                baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
                defaultModel: 'gemini-3-pro-preview',
                getKeyUrl: 'https://aistudio.google.com/apikey',
                models: [
                    ['gemini-3-pro-preview', 'Gemini 3 Pro Preview · 最强'],
                    ['gemini-3-flash-preview', 'Gemini 3 Flash Preview · 快速'],
                    ['gemini-2.5-pro', 'Gemini 2.5 Pro'],
                    ['gemini-2.5-flash', 'Gemini 2.5 Flash'],
                    ['gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite']
                ]
            },
            qwen: {
                name: '通义千问',
                baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                defaultModel: 'qwen3.7-max',
                getKeyUrl: 'https://dashscope.console.aliyun.com/apiKey',
                models: [
                    ['qwen3.7-max', 'Qwen3.7 Max · 旗舰'],
                    ['qwen3.6-plus', 'Qwen3.6 Plus · 均衡'],
                    ['qwen3.6-flash', 'Qwen3.6 Flash · 快速'],
                    ['qwen3-max', 'Qwen3 Max'],
                    ['qwen3-max-preview', 'Qwen3 Max Preview'],
                    ['qwen-plus', 'Qwen Plus'],
                    ['qwen-plus-latest', 'Qwen Plus latest'],
                    ['qwen-flash', 'Qwen Flash'],
                    ['qwen-turbo', 'Qwen Turbo'],
                    ['qwen3-coder-plus', 'Qwen3 Coder Plus'],
                    ['qwen3-coder-flash', 'Qwen3 Coder Flash']
                ]
            },
            deepseek: {
                name: 'DeepSeek',
                baseURL: 'https://api.deepseek.com/v1',
                defaultModel: 'deepseek-v4-flash',
                getKeyUrl: 'https://platform.deepseek.com/api_keys',
                models: [
                    ['deepseek-v4-pro', 'DeepSeek V4 Pro'],
                    ['deepseek-v4-flash', 'DeepSeek V4 Flash · 快速'],
                    ['deepseek-chat', 'DeepSeek Chat · 旧别名'],
                    ['deepseek-reasoner', 'DeepSeek Reasoner · 旧别名']
                ]
            },
            kimi: {
                name: 'Kimi',
                baseURL: 'https://api.moonshot.ai/v1',
                defaultModel: 'kimi-k2.6',
                getKeyUrl: 'https://platform.kimi.ai/console/api-keys',
                models: [
                    ['kimi-k2.6', 'Kimi K2.6 · 最新'],
                    ['kimi-k2.5', 'Kimi K2.5'],
                    ['kimi-k2', 'Kimi K2'],
                    ['moonshot-v1-128k', 'Moonshot v1 128k'],
                    ['moonshot-v1-32k', 'Moonshot v1 32k'],
                    ['moonshot-v1-8k', 'Moonshot v1 8k']
                ]
            },
            xai: {
                name: 'xAI Grok',
                baseURL: 'https://api.x.ai/v1',
                defaultModel: 'grok-4.3',
                getKeyUrl: 'https://console.x.ai/',
                models: [
                    ['grok-4.3', 'Grok 4.3 · 推荐'],
                    ['grok-4.3-latest', 'Grok 4.3 latest'],
                    ['grok-4.20', 'Grok 4.20 · 推理'],
                    ['grok-4.20-non-reasoning', 'Grok 4.20 non-reasoning'],
                    ['grok-4-fast', 'Grok 4 Fast'],
                    ['grok-4-fast-non-reasoning', 'Grok 4 Fast non-reasoning'],
                    ['grok-code-fast', 'Grok Code Fast']
                ]
            },
            mistral: {
                name: 'Mistral AI',
                baseURL: 'https://api.mistral.ai/v1',
                defaultModel: 'mistral-large-2512',
                getKeyUrl: 'https://console.mistral.ai/api-keys',
                models: [
                    ['mistral-large-2512', 'Mistral Large 3'],
                    ['mistral-medium-2508', 'Mistral Medium 3.1'],
                    ['mistral-small-2506', 'Mistral Small 3.2'],
                    ['magistral-medium-2509', 'Magistral Medium 1.2 · 推理'],
                    ['magistral-small-2509', 'Magistral Small 1.2'],
                    ['ministral-14b-2512', 'Ministral 3 14B'],
                    ['ministral-8b-2512', 'Ministral 3 8B'],
                    ['codestral-2508', 'Codestral · 代码']
                ]
            },
            groq: {
                name: 'Groq',
                baseURL: 'https://api.groq.com/openai/v1',
                defaultModel: 'llama-3.3-70b-versatile',
                getKeyUrl: 'https://console.groq.com/keys',
                models: [
                    ['llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile'],
                    ['llama-3.1-8b-instant', 'Llama 3.1 8B Instant'],
                    ['openai/gpt-oss-120b', 'GPT-OSS 120B'],
                    ['openai/gpt-oss-20b', 'GPT-OSS 20B'],
                    ['qwen/qwen3-32b', 'Qwen3 32B'],
                    ['qwen/qwen3-coder-480b-a35b-instruct', 'Qwen3 Coder 480B']
                ]
            },
            openrouter: {
                name: 'OpenRouter',
                baseURL: 'https://openrouter.ai/api/v1',
                defaultModel: 'openrouter/auto',
                getKeyUrl: 'https://openrouter.ai/settings/keys',
                models: [
                    ['openrouter/auto', 'OpenRouter Auto'],
                    ['openai/gpt-5.5', 'OpenAI GPT-5.5'],
                    ['anthropic/claude-opus-4.8', 'Claude Opus 4.8'],
                    ['anthropic/claude-sonnet-4.6', 'Claude Sonnet 4.6'],
                    ['google/gemini-3-pro-preview', 'Gemini 3 Pro Preview'],
                    ['x-ai/grok-4.3', 'Grok 4.3'],
                    ['deepseek/deepseek-v4-pro', 'DeepSeek V4 Pro'],
                    ['qwen/qwen3.7-max', 'Qwen3.7 Max'],
                    ['moonshotai/kimi-k2.6', 'Kimi K2.6'],
                    ['mistralai/mistral-large-2512', 'Mistral Large 3']
                ]
            },
            custom: {
                name: '自定义',
                baseURL: '',
                defaultModel: '',
                getKeyUrl: '',
                models: []
            }
        };
        this.remoteModels = {};

        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.updateProviderInfo();
    }

    initializeElements() {
        this.providerSelect = document.getElementById('provider');
        this.apiKeyInput = document.getElementById('apiKey');
        this.baseUrlInput = document.getElementById('baseUrl');
        this.baseUrlGroup = document.getElementById('baseUrl-group');
        this.modelInput = document.getElementById('model');
        this.modelOptions = document.getElementById('model-options');
        this.modelHelp = document.getElementById('model-help');
        this.refreshModelsBtn = document.getElementById('refresh-models-btn');
        this.outputLanguageSelect = document.getElementById('outputLanguage');
        this.detailLevelSelect = document.getElementById('detailLevel');
        this.rememberSummariesInput = document.getElementById('rememberSummaries');
        this.getKeyLink = document.getElementById('get-key-link');
        this.saveBtn = document.getElementById('save-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.testBtn = document.getElementById('test-btn');
        this.testResult = document.getElementById('test-result');
        this.testResultContent = document.getElementById('test-result-content');
        this.testResultClose = document.getElementById('test-result-close');
        this.statusMessage = document.getElementById('status-message');
    }

    bindEvents() {
        this.providerSelect.addEventListener('change', () => {
            this.updateProviderInfo({ userInitiated: true });
        });

        this.saveBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        this.clearBtn.addEventListener('click', () => {
            this.clearSettings();
        });

        this.testBtn.addEventListener('click', () => {
            this.testConnection();
        });

        this.refreshModelsBtn.addEventListener('click', () => {
            this.refreshModels();
        });

        this.testResultClose.addEventListener('click', () => {
            this.hideTestResult();
        });
    }

    updateProviderInfo(options = {}) {
        const provider = this.providerSelect.value;
        const providerInfo = this.providers[provider];
        const currentModel = this.modelInput.value.trim();
        const shouldReplaceModel = !currentModel || this.isKnownModelId(currentModel);

        if (provider === 'custom') {
            this.baseUrlGroup.style.display = 'block';
            this.getKeyLink.style.display = 'none';
            if (options.userInitiated && this.isKnownBaseURL(this.baseUrlInput.value.trim())) {
                this.baseUrlInput.value = '';
            }
        } else {
            this.baseUrlGroup.style.display = 'none';
            this.baseUrlInput.value = providerInfo.baseURL;
            this.getKeyLink.style.display = 'inline';
            this.getKeyLink.href = providerInfo.getKeyUrl;
            this.getKeyLink.target = '_blank';
            this.getKeyLink.rel = 'noreferrer';
            this.getKeyLink.textContent = `获取 ${providerInfo.name} API Key`;
        }

        if (providerInfo.defaultModel && shouldReplaceModel) {
            this.modelInput.value = providerInfo.defaultModel;
        }

        this.updateModelOptions(provider);
    }

    updateModelOptions(provider = this.providerSelect.value) {
        const providerInfo = this.providers[provider] || this.providers.custom;
        const localModels = providerInfo.models || [];
        const remoteModels = this.remoteModels[provider] || [];
        const modelRows = [
            ...localModels,
            ...remoteModels
                .filter(id => !localModels.some(([localId]) => localId === id))
                .map(id => [id, id])
        ];

        this.modelOptions.innerHTML = '';
        modelRows.forEach(([id, label]) => {
            const option = document.createElement('option');
            option.value = id;
            option.label = label;
            this.modelOptions.appendChild(option);
        });

        if (provider === 'custom') {
            this.modelHelp.textContent = '请输入自定义服务支持的模型 ID；如果该服务支持 /models，可点击刷新读取。';
        } else {
            this.modelHelp.textContent = `已内置 ${providerInfo.name} 的常用模型。也可以手动输入账号可用的其他模型 ID，或点击刷新读取 /models。`;
        }
    }

    async refreshModels() {
        const settings = this.collectSettings();
        const validationError = this.validateSettings(settings, { requireModel: false });
        if (validationError) {
            this.showStatus(validationError, false);
            return;
        }

        this.setRefreshLoading(true);
        this.showStatus('正在读取模型列表...', true);

        try {
            await this.ensureHostPermission(settings);
            const models = await this.fetchModels(settings.baseUrl, settings.apiKey);
            if (!models.length) {
                this.showStatus('没有从 /models 读取到可用模型，可继续手动输入模型 ID。', false);
                return;
            }

            this.remoteModels[settings.provider] = models;
            this.updateModelOptions(settings.provider);

            if (!this.modelInput.value.trim()) {
                this.modelInput.value = models[0];
            }

            this.showStatus(`已读取 ${models.length} 个模型。`, true);
        } catch (error) {
            console.error('[QuickRead] Refresh models failed:', error);
            this.showStatus(this.toUserFacingError(error), false);
        } finally {
            this.setRefreshLoading(false);
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.local.get([
                'provider',
                'apiKey',
                'model',
                'baseUrl',
                'outputLanguage',
                'detailLevel',
                'rememberSummaries'
            ]);

            const savedProvider = result.provider;
            const providerValid = savedProvider && this.providers[savedProvider] && VISIBLE_PROVIDERS.has(savedProvider);
            if (savedProvider && this.providers[savedProvider] && !VISIBLE_PROVIDERS.has(savedProvider)) {
                // Saved provider is hidden in首发 version — fall back to openai
                console.log('[QuickRead] Saved provider "%s" is hidden in首发 version, falling back to openai', savedProvider);
            }
            if (providerValid) {
                this.providerSelect.value = savedProvider;
                this.updateProviderInfo();
            }

            if (result.apiKey) {
                this.apiKeyInput.value = result.apiKey;
            }

            if (result.baseUrl) {
                this.baseUrlInput.value = result.baseUrl;
            } else if (this.providerSelect.value !== 'custom') {
                this.baseUrlInput.value = this.providers[this.providerSelect.value].baseURL;
            }

            if (result.model) {
                this.modelInput.value = result.model;
            } else {
                this.modelInput.value = this.providers[this.providerSelect.value].defaultModel || '';
            }

            this.outputLanguageSelect.value = result.outputLanguage || 'auto';
            this.detailLevelSelect.value = result.detailLevel || 'balanced';
            this.rememberSummariesInput.checked = result.rememberSummaries !== false;
        } catch (error) {
            console.error('[QuickRead] Error loading settings:', error);
            this.showStatus('加载设置失败', false);
        }
    }

    async saveSettings() {
        const settings = this.collectSettings();
        const validationError = this.validateSettings(settings);
        if (validationError) {
            this.showStatus(validationError, false);
            return;
        }

        this.setLoading(true);
        this.showStatus('正在验证 API Key...', true);

        try {
            await this.ensureHostPermission(settings);
            await this.validateApiKey(settings.baseUrl, settings.apiKey, settings.model);

            await chrome.storage.local.set({
                provider: settings.provider,
                apiKey: settings.apiKey,
                baseUrl: settings.baseUrl,
                model: settings.model,
                outputLanguage: settings.outputLanguage,
                detailLevel: settings.detailLevel,
                rememberSummaries: settings.rememberSummaries,
                hasOnboarded: true
            });

            this.showStatus('验证成功，设置已保存。', true);

            setTimeout(() => {
                window.close();
            }, 1200);
        } catch (error) {
            console.error('[QuickRead] Error saving settings:', error);
            this.showStatus(this.toUserFacingError(error), false);
        } finally {
            this.setLoading(false);
        }
    }

    async testConnection() {
        const settings = this.collectSettings();
        const validationError = this.validateSettings(settings);
        if (validationError) {
            this.showStatus(validationError, false);
            return;
        }

        this.setTestLoading(true);
        this.showStatus('正在测试连接...', true);

        try {
            await this.ensureHostPermission(settings);
            const response = await this.validateApiKey(
                settings.baseUrl,
                settings.apiKey,
                settings.model,
                '你好，请用一句话介绍你自己'
            );
            const content = response.choices?.[0]?.message?.content || JSON.stringify(response, null, 2);

            this.showStatus('连接测试成功。', true);
            this.showTestResult(content);
        } catch (error) {
            console.error('[QuickRead] Test connection failed:', error);
            const message = this.toUserFacingError(error);
            this.showStatus(message, false);
            this.showTestResult(`错误：${message}`);
        } finally {
            this.setTestLoading(false);
        }
    }

    collectSettings() {
        const provider = this.providerSelect.value;
        const providerInfo = this.providers[provider] || this.providers.openai;
        const baseUrl = provider === 'custom'
            ? this.baseUrlInput.value.trim()
            : providerInfo.baseURL;

        return {
            provider,
            apiKey: this.apiKeyInput.value.trim(),
            baseUrl: this.normalizeBaseURL(baseUrl),
            model: this.modelInput.value.trim(),
            outputLanguage: this.outputLanguageSelect.value,
            detailLevel: this.detailLevelSelect.value,
            rememberSummaries: this.rememberSummariesInput.checked
        };
    }

    validateSettings(settings, options = {}) {
        const requireModel = options.requireModel !== false;

        if (!settings.apiKey) {
            return '请输入 API Key';
        }
        if (!settings.baseUrl) {
            return '请输入 API 基础 URL';
        }
        if (requireModel && !settings.model) {
            return '请输入模型名称';
        }

        try {
            const url = new URL(settings.baseUrl);
            if (!['https:', 'http:'].includes(url.protocol)) {
                return 'API URL 必须以 http:// 或 https:// 开头';
            }
            if (url.protocol === 'http:' && !this.isLocalhost(url.hostname)) {
                return '普通 HTTP 只允许用于 localhost 或 127.0.0.1；线上服务请使用 HTTPS';
            }
        } catch (error) {
            return 'API 基础 URL 格式不正确';
        }

        return '';
    }

    async fetchModels(baseUrl, apiKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(`${baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                },
                signal: controller.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = errorData.error;
                throw new Error(typeof error === 'string' ? error : error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const models = Array.isArray(data.data) ? data.data : [];

            return models
                .map(model => model.id || model.name || model.model)
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
                .slice(0, 300);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('timeout');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async ensureHostPermission(settings) {
        if (settings.provider !== 'custom' || !chrome.permissions?.request) {
            return;
        }

        const originPattern = this.getOriginPattern(settings.baseUrl);
        const granted = await chrome.permissions.request({ origins: [originPattern] });
        if (!granted) {
            throw new Error('custom_origin_permission_denied');
        }
    }

    getOriginPattern(baseUrl) {
        const url = new URL(baseUrl);
        return `${url.protocol}//${url.hostname}/*`;
    }

    async validateApiKey(baseUrl, apiKey, model, testPrompt = 'test') {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: testPrompt }],
                    max_tokens: 100
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const error = errorData.error;
                throw new Error(typeof error === 'string' ? error : error?.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('timeout');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async clearSettings() {
        if (!confirm('确定要清除连接配置吗？这会删除 API Key，并在下次打开时重新进入配置流程。')) {
            return;
        }

        try {
            await chrome.storage.local.remove([
                'provider',
                'apiKey',
                'model',
                'baseUrl',
                'hasOnboarded'
            ]);
            this.providerSelect.value = 'openai';
            this.apiKeyInput.value = '';
            this.baseUrlInput.value = this.providers.openai.baseURL;
            this.modelInput.value = this.providers.openai.defaultModel;
            this.updateProviderInfo();
            this.showStatus('连接配置已清除', true);
        } catch (error) {
            console.error('[QuickRead] Error clearing settings:', error);
            this.showStatus('清除设置失败', false);
        }
    }

    showTestResult(content) {
        this.testResultContent.textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        this.testResult.style.display = 'block';
    }

    hideTestResult() {
        this.testResult.style.display = 'none';
    }

    setTestLoading(loading) {
        if (loading) {
            this.testBtn.disabled = true;
            this.testBtn.innerHTML = '<span class="loading"></span>测试中...';
        } else {
            this.testBtn.disabled = false;
            this.testBtn.textContent = '测试连接';
        }
    }

    setRefreshLoading(loading) {
        if (loading) {
            this.refreshModelsBtn.disabled = true;
            this.refreshModelsBtn.innerHTML = '<span class="loading"></span>读取';
        } else {
            this.refreshModelsBtn.disabled = false;
            this.refreshModelsBtn.textContent = '刷新';
        }
    }

    showStatus(message, isSuccess) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = 'status-message';
        this.statusMessage.classList.add(isSuccess ? 'status-success' : 'status-error');
        this.statusMessage.style.display = 'block';
    }

    setLoading(loading) {
        if (loading) {
            this.saveBtn.disabled = true;
            this.saveBtn.innerHTML = '<span class="loading"></span>验证中...';
        } else {
            this.saveBtn.disabled = false;
            this.saveBtn.textContent = '保存';
        }
    }

    toUserFacingError(error) {
        const message = error.message || '';
        if (message === 'custom_origin_permission_denied') {
            return '未授予自定义 API 域名权限，无法连接该服务';
        }
        if (message.includes('invalid_api_key') || message.includes('authentication') || message.includes('401')) {
            return 'API Key 无效，请检查或更换';
        }
        if (message.includes('quota') || message.includes('insufficient') || message.includes('402')) {
            return 'API 额度不足，请充值或换 Key';
        }
        if (message.includes('timeout')) {
            return '请求超时，请检查 URL 和网络连接';
        }
        if (message.includes('404')) {
            return '模型不存在或 URL 错误';
        }
        if (message.includes('Failed to fetch')) {
            return '无法访问 API 地址，请检查网络、URL 或浏览器权限';
        }
        return '验证失败，请检查 URL、模型名称和 API Key';
    }

    normalizeBaseURL(baseURL) {
        return String(baseURL || '').trim().replace(/\/+$/, '');
    }

    isKnownModelId(model) {
        return Object.values(this.providers).some(provider => {
            const localModels = provider.models || [];
            return provider.defaultModel === model || localModels.some(([id]) => id === model);
        });
    }

    isKnownBaseURL(baseURL) {
        const normalized = this.normalizeBaseURL(baseURL);
        return Object.values(this.providers).some(provider => provider.baseURL === normalized);
    }

    isLocalhost(hostname) {
        return ['localhost', '127.0.0.1'].includes(hostname);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuickReadSettings();
});
