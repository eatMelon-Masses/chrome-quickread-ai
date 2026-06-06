// QuickRead AI Popup Script

class QuickReadPopup {
    constructor() {
        this.currentMode = 'quick';
        this.currentPageContent = '';
        this.currentPageUrl = '';
        this.currentPageTitle = '';
        this.currentPageMeta = {};
        this.currentSourceType = 'page';
        this.currentSummary = '';
        this.abortController = null;
        this.cacheTtlMs = 24 * 60 * 60 * 1000;
        this.maxCacheEntries = 30;

        this.initializeElements();
        this.bindEvents();
        this.checkOnboarding();
    }

    initializeElements() {
        this.mainView = document.getElementById('main-view');
        this.onboardingView = document.getElementById('onboarding-view');
        this.summaryContainer = document.getElementById('summary-container');
        this.summaryElement = document.getElementById('summary');
        this.loadingElement = document.getElementById('loading');
        this.errorElement = document.getElementById('error');
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.regenerateBtn = document.getElementById('regenerate-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.setupBtn = document.getElementById('setup-btn');
        this.closeBtn = document.getElementById('close-btn');
        this.pageContext = document.getElementById('page-context');
        this.pageTitleElement = document.getElementById('page-title');
        this.sourcePill = document.getElementById('source-pill');
        this.pageStats = document.getElementById('page-stats');
        this.cacheNote = document.getElementById('cache-note');
    }

    bindEvents() {
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', event => {
                this.switchMode(event.currentTarget.dataset.mode);
            });
        });

        this.copyBtn.addEventListener('click', () => this.copySummary());
        this.regenerateBtn.addEventListener('click', () => {
            if (this.abortController) {
                this.abortController.abort();
            }
            this.generateSummary({ force: true });
        });
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.setupBtn.addEventListener('click', () => this.openSettings());
        this.closeBtn.addEventListener('click', () => window.close());

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                window.close();
            }
        });
    }

    async checkOnboarding() {
        try {
            const result = await chrome.storage.local.get(['hasOnboarded']);
            if (result.hasOnboarded) {
                this.showMainView();
                const loaded = await this.loadPageContent();
                if (loaded) {
                    await this.generateSummary();
                }
            } else {
                this.showOnboardingView();
            }
        } catch (error) {
            console.error('[QuickRead] Error checking onboarding:', error);
            this.showError('初始化失败，请重试');
        }
    }

    async loadPageContent() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id || !tab.url) {
                this.showError('无法读取当前页面，请打开普通网页后重试');
                return false;
            }

            this.currentPageUrl = tab.url;
            this.currentPageTitle = tab.title || '';

            if (this.isUnsupportedUrl(tab.url)) {
                this.showError('此页面不支持读取，请打开普通网页');
                return false;
            }

            const response = await this.requestPageContent(tab.id);
            const content = typeof response === 'string' ? response : response?.content;
            const sourceType = response?.sourceType || 'page';
            const minLength = sourceType === 'selection' ? 80 : 300;

            if (!content || content.length < minLength) {
                this.showError(sourceType === 'selection' ? '选中文本太短，无法生成摘要' : '页面内容太短，无法生成摘要');
                return false;
            }

            this.currentPageContent = content;
            this.currentSourceType = sourceType;
            this.currentPageMeta = {
                ...(response?.metadata || {}),
                title: response?.metadata?.title || this.currentPageTitle,
                url: response?.metadata?.url || this.currentPageUrl
            };
            this.updatePageContext();
            return true;
        } catch (error) {
            console.error('[QuickRead] Error loading page content:', error);
            this.showError('无法读取页面内容，请刷新页面后重试');
            return false;
        }
    }

    isUnsupportedUrl(url) {
        return /^(chrome|chrome-extension|edge|about|devtools|view-source):/i.test(url);
    }

    async requestPageContent(tabId) {
        try {
            return await chrome.tabs.sendMessage(tabId, { action: 'extractContent' });
        } catch (sendError) {
            console.log('[QuickRead] Message failed, trying to inject script:', sendError);
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ['content.js']
            });
            await new Promise(resolve => setTimeout(resolve, 80));
            return await chrome.tabs.sendMessage(tabId, { action: 'extractContent' });
        }
    }

    updatePageContext() {
        const title = this.currentPageMeta.title || this.currentPageTitle || '当前页面';
        const siteName = this.currentPageMeta.siteName || this.hostnameFromUrl(this.currentPageUrl);
        const readingMinutes = this.currentPageMeta.readingMinutes;
        const charCount = this.currentPageMeta.charCount || this.currentPageContent.length;
        const sourceLabel = this.currentSourceType === 'selection' ? '选中文本' : '网页正文';
        const stats = [
            siteName,
            charCount ? `${this.formatNumber(charCount)} 字符` : '',
            readingMinutes ? `约 ${readingMinutes} 分钟阅读` : ''
        ].filter(Boolean);

        this.pageTitleElement.textContent = title;
        this.sourcePill.textContent = sourceLabel;
        this.pageStats.textContent = stats.join(' · ');
        this.pageContext.classList.remove('hidden');
    }

    switchMode(mode) {
        if (!mode || mode === this.currentMode) {
            return;
        }

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        this.currentMode = mode;
        this.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        this.generateSummary();
    }

    async generateSummary(options = {}) {
        if (!this.currentPageContent) {
            const loaded = await this.loadPageContent();
            if (!loaded) {
                return;
            }
        }

        if (this.abortController) {
            this.abortController.abort();
        }
        const controller = new AbortController();
        this.abortController = controller;

        this.showLoading();
        this.hideError();
        this.currentSummary = '';

        try {
            const config = await this.loadConfig();

            if (!config.apiKey) {
                this.showError('请先配置 API Key', true);
                return;
            }

            const cacheKey = this.getSummaryCacheKey(config);
            if (!options.force && config.rememberSummaries) {
                const cached = await this.getCachedSummary(cacheKey);
                if (cached) {
                    this.showRenderedSummary(cached.summary, { fromCache: true });
                    return;
                }
            }

            const baseURL = this.normalizeBaseURL(config.baseUrl || this.getProviderBaseURL(config.provider));
            const messages = this.buildPromptMessages(
                this.currentMode,
                this.currentPageMeta.title || this.currentPageTitle || 'Untitled',
                this.currentPageContent,
                config
            );

            const response = await fetch(`${baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages,
                    max_tokens: this.getMaxTokens(config.detailLevel),
                    stream: true
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                this.handleAPIError(response.status, errorData);
                return;
            }

            await this.handleStreamResponse(response);

            if (!this.currentSummary.trim()) {
                throw new Error('API 返回空响应');
            }

            if (config.rememberSummaries) {
                await this.storeCachedSummary(cacheKey, this.currentSummary);
            }

            await chrome.storage.local.set({ hasOnboarded: true });
        } catch (error) {
            console.error('[QuickRead] Error generating summary:', error);
            if (error.name === 'AbortError') {
                return;
            }
            if (error.message.includes('Failed to fetch')) {
                this.showError('无法访问 API 地址，请检查网络、URL 或自定义提供商权限。', true);
            } else if (error.message.includes('API Key') || error.message.includes('401')) {
                this.showError('API Key 无效，请检查或更换', true);
            } else if (error.message.includes('quota') || error.message.includes('402')) {
                this.showError('API 额度不足，请充值或换 Key', true);
            } else if (error.message.includes('timeout')) {
                this.showError('请求超时，请重试');
            } else {
                this.showError(error.message || '生成摘要失败，请重试');
            }
        } finally {
            if (this.abortController === controller) {
                this.abortController = null;
            }
        }
    }

    async loadConfig() {
        const config = await chrome.storage.local.get([
            'apiKey',
            'provider',
            'model',
            'baseUrl',
            'outputLanguage',
            'detailLevel',
            'rememberSummaries'
        ]);
        const provider = config.provider || 'openai';

        return {
            provider,
            apiKey: config.apiKey || '',
            baseUrl: this.normalizeBaseURL(config.baseUrl || this.getProviderBaseURL(provider)),
            model: config.model || this.getProviderDefaultModel(provider),
            outputLanguage: config.outputLanguage || 'auto',
            detailLevel: config.detailLevel || 'balanced',
            rememberSummaries: config.rememberSummaries !== false
        };
    }

    async handleStreamResponse(response) {
        if (!response.body) {
            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';
            this.showRenderedSummary(content);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let contentReady = false;

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                this.handleStreamLine(line);
            }

            if (this.currentSummary) {
                if (!contentReady) {
                    contentReady = true;
                    this.hideLoading();
                    this.mainView.classList.remove('hidden');
                }
                this.renderSummaryNow();
            }
        }

        if (buffer.trim()) {
            this.handleStreamLine(buffer);
        }
        if (this.currentSummary) {
            if (!contentReady) {
                this.hideLoading();
                this.mainView.classList.remove('hidden');
            }
            this.renderSummaryNow();
        }
    }

    handleStreamLine(line) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('data:')) {
            return;
        }

        const data = trimmedLine.slice(5).trim();
        if (!data || data === '[DONE]') {
            return;
        }

        try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
            if (delta) {
                this.currentSummary += delta;
            }
        } catch (error) {
            console.debug('[QuickRead] Skipping malformed stream chunk:', error);
        }
    }

    renderSummaryNow() {
        this.summaryElement.innerHTML = this.renderMarkdown(this.currentSummary);
        this.summaryContainer.scrollTop = this.summaryContainer.scrollHeight;
    }

    showRenderedSummary(summary, options = {}) {
        this.currentSummary = summary || '';
        this.hideLoading();
        this.summaryElement.innerHTML = this.renderMarkdown(this.currentSummary);
        this.cacheNote.classList.toggle('hidden', !options.fromCache);
        this.mainView.classList.remove('hidden');
    }

    renderMarkdown(markdown) {
        const lines = (markdown || '').replace(/\r/g, '').split('\n');
        const html = [];
        let inUl = false;
        let inOl = false;
        let inCode = false;
        let codeLines = [];

        const closeLists = () => {
            if (inUl) {
                html.push('</ul>');
                inUl = false;
            }
            if (inOl) {
                html.push('</ol>');
                inOl = false;
            }
        };

        for (const rawLine of lines) {
            const line = rawLine.trim();

            if (line.startsWith('```')) {
                if (inCode) {
                    html.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
                    codeLines = [];
                    inCode = false;
                } else {
                    closeLists();
                    inCode = true;
                }
                continue;
            }

            if (inCode) {
                codeLines.push(this.escapeHtml(rawLine));
                continue;
            }

            if (!line) {
                closeLists();
                continue;
            }

            const heading = /^(#{1,4})\s+(.+)$/.exec(line);
            if (heading) {
                closeLists();
                const tag = heading[1].length <= 2 ? 'h2' : 'h3';
                html.push(`<${tag}>${this.formatInline(heading[2])}</${tag}>`);
                continue;
            }

            const bullet = /^[-*]\s+(.+)$/.exec(line);
            if (bullet) {
                if (!inUl) {
                    closeLists();
                    html.push('<ul>');
                    inUl = true;
                }
                html.push(`<li>${this.formatInline(bullet[1])}</li>`);
                continue;
            }

            const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
            if (numbered) {
                if (!inOl) {
                    closeLists();
                    html.push('<ol>');
                    inOl = true;
                }
                html.push(`<li>${this.formatInline(numbered[1])}</li>`);
                continue;
            }

            const quote = /^>\s+(.+)$/.exec(line);
            if (quote) {
                closeLists();
                html.push(`<blockquote>${this.formatInline(quote[1])}</blockquote>`);
                continue;
            }

            closeLists();
            html.push(`<p>${this.formatInline(line)}</p>`);
        }

        closeLists();
        if (inCode) {
            html.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
        }

        return html.join('');
    }

    formatInline(text) {
        let escaped = this.escapeHtml(text);
        escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
        escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
        return escaped;
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    getSummaryCacheKey(config) {
        const contentFingerprint = [
            this.currentPageContent.length,
            this.currentPageContent.slice(0, 1500),
            this.currentPageContent.slice(-1500)
        ].join('|');

        return this.hashText(JSON.stringify({
            url: this.currentPageUrl,
            title: this.currentPageMeta.title || this.currentPageTitle,
            sourceType: this.currentSourceType,
            mode: this.currentMode,
            provider: config.provider,
            baseUrl: config.baseUrl,
            model: config.model,
            outputLanguage: config.outputLanguage,
            detailLevel: config.detailLevel,
            contentHash: this.hashText(contentFingerprint)
        }));
    }

    async getCachedSummary(cacheKey) {
        const result = await chrome.storage.local.get(['summaryCache']);
        const cache = result.summaryCache || {};
        const entry = cache[cacheKey];

        if (!entry) {
            return null;
        }

        if (Date.now() - entry.timestamp > this.cacheTtlMs) {
            delete cache[cacheKey];
            await chrome.storage.local.set({ summaryCache: cache });
            return null;
        }

        return entry;
    }

    async storeCachedSummary(cacheKey, summary) {
        const result = await chrome.storage.local.get(['summaryCache']);
        const cache = result.summaryCache || {};

        cache[cacheKey] = {
            summary,
            mode: this.currentMode,
            title: this.currentPageMeta.title || this.currentPageTitle,
            url: this.currentPageUrl,
            timestamp: Date.now()
        };

        const entries = Object.entries(cache)
            .sort((a, b) => b[1].timestamp - a[1].timestamp)
            .slice(0, this.maxCacheEntries);

        await chrome.storage.local.set({ summaryCache: Object.fromEntries(entries) });
    }

    hashText(text) {
        let hash = 2166136261;
        for (let i = 0; i < text.length; i += 1) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16);
    }

    buildPromptMessages(mode, pageTitle, pageContent, config) {
        const languageInstruction = this.getOutputLanguageInstruction(config.outputLanguage);
        const detailInstruction = this.getDetailInstruction(config.detailLevel);
        const sourceLabel = this.currentSourceType === 'selection' ? '用户选中的页面片段' : '网页正文';
        const metadata = [
            `页面标题：${pageTitle}`,
            this.currentPageMeta.siteName ? `站点：${this.currentPageMeta.siteName}` : '',
            this.currentPageMeta.description ? `页面描述：${this.currentPageMeta.description}` : ''
        ].filter(Boolean).join('\n');

        const prompts = {
            quick: `请生成适合快速判断是否继续阅读的摘要。

输出结构：
### TL;DR
用 1-2 句话说清楚这篇内容最重要的信息。

### 关键要点
- 保留 3-6 个高信息量要点。
- 优先保留结论、数字、日期、人物、产品名、因果关系。

### 为什么重要
用一句话说明读者应该关注什么。`,
            learn: `请把内容整理成适合学习和复习的笔记。

输出结构：
### 核心概念
解释主要概念和术语。

### 知识框架
按逻辑层级组织内容，说明概念之间的关系。

### 关键要点
- 列出必须记住的事实、结论或方法。

### 延伸问题
给出 2-4 个值得继续追问的问题。`,
            decide: `请提取能帮助做决定的信息。

输出结构：
### 摘要
概括这份内容与决策相关的部分。

### 关键事实
- 列出数字、日期、条件、限制、价格、版本或证据。

### 利好
- 列出正面因素或机会。

### 风险
- 列出缺点、不确定性、隐藏成本或适用边界。

### 建议
给出客观、可执行的判断建议；如果信息不足，明确指出还缺什么。`
        };

        return [
            {
                role: 'system',
                content: `你是 QuickRead AI，一个严谨的网页阅读助手。只基于用户提供的${sourceLabel}作答，不要编造未出现的信息。输出 Markdown，但不要把整段回答包在代码块里。${languageInstruction} ${detailInstruction}`
            },
            {
                role: 'user',
                content: `${metadata}

内容来源：${sourceLabel}

${prompts[mode] || prompts.quick}

以下是需要分析的内容：
${pageContent}`
            }
        ];
    }

    getOutputLanguageInstruction(language) {
        const instructions = {
            auto: '输出语言跟随原文语言。',
            zh: '使用简体中文输出。',
            en: 'Use English for the entire answer.',
            ja: '日本語で出力してください。'
        };
        return instructions[language] || instructions.auto;
    }

    getDetailInstruction(detailLevel) {
        const instructions = {
            brief: '保持精简，只保留最高价值信息。',
            balanced: '保持均衡，兼顾信息密度和可读性。',
            deep: '适当展开背景、关系和影响，但仍避免冗长。'
        };
        return instructions[detailLevel] || instructions.balanced;
    }

    getMaxTokens(detailLevel) {
        const maxTokens = {
            brief: 900,
            balanced: 1600,
            deep: 2400
        };
        return maxTokens[detailLevel] || maxTokens.balanced;
    }

    getProviderBaseURL(provider) {
        const providers = {
            openai: 'https://api.openai.com/v1',
            anthropic: 'https://api.anthropic.com/v1',
            gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
            qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            deepseek: 'https://api.deepseek.com/v1',
            kimi: 'https://api.moonshot.ai/v1',
            xai: 'https://api.x.ai/v1',
            mistral: 'https://api.mistral.ai/v1',
            groq: 'https://api.groq.com/openai/v1',
            openrouter: 'https://openrouter.ai/api/v1'
        };
        return providers[provider] || providers.openai;
    }

    getProviderDefaultModel(provider) {
        const models = {
            openai: 'gpt-5.5',
            anthropic: 'claude-sonnet-4-6',
            gemini: 'gemini-3-pro-preview',
            qwen: 'qwen3.7-max',
            deepseek: 'deepseek-v4-flash',
            kimi: 'kimi-k2.6',
            xai: 'grok-4.3',
            mistral: 'mistral-large-2512',
            groq: 'llama-3.3-70b-versatile',
            openrouter: 'openrouter/auto'
        };
        return models[provider] || models.openai;
    }

    normalizeBaseURL(baseURL) {
        return String(baseURL || '').trim().replace(/\/+$/, '');
    }

    handleAPIError(status, errorData) {
        const error = errorData.error;
        let message = typeof error === 'string' ? error : error?.message || `HTTP ${status}: 未知错误`;

        switch (status) {
            case 400:
                message = '请求参数无效，请检查模型名称或 API URL。';
                break;
            case 401:
                message = 'API Key 无效或已过期，请在设置中检查。';
                break;
            case 402:
            case 403:
                message = 'API 配额、余额或权限不足，请检查账户。';
                break;
            case 404:
                message = '模型不存在或 API URL 错误。';
                break;
            case 429:
                message = '请求过于频繁，请稍后再试。';
                break;
            case 500:
            case 502:
            case 503:
                message = 'API 服务暂时不可用，请稍后重试。';
                break;
        }

        this.showError(message, status === 401 || status === 403 || status === 404);
    }

    showSummary(summary) {
        this.showRenderedSummary(summary);
    }

    showLoading() {
        this.loadingElement.classList.remove('hidden');
        this.summaryElement.textContent = '';
        this.errorElement.classList.add('hidden');
        this.cacheNote.classList.add('hidden');
        this.mainView.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingElement.classList.add('hidden');
    }

    showError(message, showSettings = false) {
        this.hideLoading();
        this.errorElement.textContent = message;
        this.errorElement.classList.remove('hidden');

        if (showSettings) {
            this.settingsBtn.style.display = 'block';
        }
    }

    hideError() {
        this.errorElement.classList.add('hidden');
    }

    async copySummary() {
        try {
            const textToCopy = this.currentSummary || this.summaryElement.innerText;
            if (!textToCopy.trim()) {
                this.showError('没有可复制的摘要');
                return;
            }

            await navigator.clipboard.writeText(textToCopy);
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = '已复制';
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
            }, 1600);
        } catch (error) {
            console.error('[QuickRead] Copy failed:', error);
            this.showError('复制失败，请手动复制');
        }
    }

    openSettings() {
        chrome.runtime.openOptionsPage();
        window.close();
    }

    showMainView() {
        this.mainView.classList.remove('hidden');
        this.onboardingView.classList.add('hidden');
    }

    showOnboardingView() {
        this.onboardingView.classList.remove('hidden');
        this.mainView.classList.add('hidden');
    }

    formatNumber(value) {
        return new Intl.NumberFormat('zh-CN').format(value);
    }

    hostnameFromUrl(url) {
        try {
            return new URL(url).hostname;
        } catch (error) {
            return '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new QuickReadPopup();
});
