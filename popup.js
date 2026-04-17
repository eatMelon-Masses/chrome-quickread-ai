// QuickRead AI Popup Script

class QuickReadPopup {
    constructor() {
        this.currentMode = 'quick';
        this.currentPageContent = '';
        this.currentPageUrl = '';
        this.currentPageTitle = '';
        
        this.initializeElements();
        this.bindEvents();
        this.checkOnboarding();
    }
    
    initializeElements() {
        this.mainView = document.getElementById('main-view');
        this.onboardingView = document.getElementById('onboarding-view');
        this.summaryElement = document.getElementById('summary');
        this.loadingElement = document.getElementById('loading');
        this.errorElement = document.getElementById('error');
        this.modeButtons = document.querySelectorAll('.mode-btn');
        this.copyBtn = document.getElementById('copy-btn');
        this.regenerateBtn = document.getElementById('regenerate-btn');
        this.settingsBtn = document.getElementById('settings-btn');
        this.setupBtn = document.getElementById('setup-btn');
        this.closeBtn = document.getElementById('close-btn');
    }
    
    bindEvents() {
        // Mode selection
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });
        
        // Action buttons
        this.copyBtn.addEventListener('click', () => this.copySummary());
        this.regenerateBtn.addEventListener('click', () => this.generateSummary());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.setupBtn.addEventListener('click', () => this.openSettings());
        this.closeBtn.addEventListener('click', () => window.close());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.close();
            }
        });
    }
    
    async checkOnboarding() {
        try {
            const result = await chrome.storage.local.get(['hasOnboarded']);
            if (result.hasOnboarded) {
                this.showMainView();
                await this.loadPageContent();
            } else {
                this.showOnboardingView();
            }
        } catch (error) {
            console.error('Error checking onboarding:', error);
            this.showError('初始化失败，请重试');
        }
    }
    
    async loadPageContent() {
        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentPageUrl = tab.url;
            this.currentPageTitle = tab.title;

            // Send message to content script to extract page content
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractContent' });

            if (response && response.content) {
                this.currentPageContent = response.content;
                if (this.currentPageContent.length < 300) {
                    this.showError('页面内容太短，无法生成摘要');
                    return;
                }
                await this.generateSummary();
            } else {
                this.showError('无法读取此页面内容，请尝试其他网页');
            }
        } catch (error) {
            console.error('Error loading page content:', error);
            this.showError('无法读取页面内容，请确保页面已完全加载');
        }
    }
    
    switchMode(mode) {
        this.currentMode = mode;
        this.modeButtons.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        this.generateSummary();
    }
    
    async generateSummary() {
        if (!this.currentPageContent) {
            await this.loadPageContent();
            return;
        }

        this.showLoading();
        this.hideError();

        try {
            // Get API configuration
            const config = await chrome.storage.local.get(['apiKey', 'provider', 'model']);

            if (!config.apiKey) {
                this.showError('请先配置 API Key', true);
                return;
            }

            // Build prompt based on mode
            const messages = this.buildPromptMessages(
                this.currentMode,
                this.currentPageTitle || 'Untitled',
                this.currentPageContent
            );

            // Get provider base URL
            const baseURL = this.getProviderBaseURL(config.provider || 'openai');

            // Call LLM API
            const response = await fetch(`${baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model || 'gpt-4o-mini',
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                this.handleAPIError(response.status, errorData);
                return;
            }

            const data = await response.json();
            const summary = data.choices?.[0]?.message?.content;

            if (!summary) {
                throw new Error('API 返回空响应');
            }

            this.showSummary(summary);

            // Mark as onboarded
            await chrome.storage.local.set({ hasOnboarded: true });

        } catch (error) {
            console.error('Error generating summary:', error);
            if (error.message.includes('API Key') || error.message.includes('401')) {
                this.showError('API Key 无效，请检查或更换', true);
            } else if (error.message.includes('quota') || error.message.includes('402')) {
                this.showError('API 额度不足，请充值或换 Key', true);
            } else if (error.message.includes('timeout') || error.name === 'AbortError') {
                this.showError('请求超时，请重试');
            } else {
                this.showError(error.message || '生成摘要失败，请重试');
            }
        }
    }

    getProviderBaseURL(provider) {
        const providers = {
            openai: 'https://api.openai.com/v1',
            qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
            deepseek: 'https://api.deepseek.com/v1'
        };
        return providers[provider] || providers.openai;
    }

    buildPromptMessages(mode, pageTitle, pageContent) {
        const prompts = {
            quick: {
                system: `你是一个简洁的内容摘要助手。从网页内容中提取关键点，适合快速浏览。

指导原则：
- 关注主要观点和关键信息
- 简洁但有信息量
- 使用项目符号提高可读性
- 最后用一句话总结
- 保持 3-5 个要点
- 使用与原文相同的语言`,
                user: `请为以下网页内容生成快速浏览摘要。

**页面标题:** ${pageTitle}

**内容:**
${pageContent}

**输出格式:**
- 3-5 个要点，突出关键信息
- 最后用"总结："标签给出一句话结论`
            },
            learn: {
                system: `你是一个教育内容分析师。帮助用户深入理解和学习内容。

指导原则：
- 识别核心概念和关键知识点
- 以逻辑知识框架组织信息
- 解释概念之间的关系
- 包含实际应用或扩展
- 使用清晰的标题和结构化格式
- 使用与原文相同的语言`,
                user: `请分析以下网页内容，用于学习目的。

**页面标题:** ${pageTitle}

**内容:**
${pageContent}

**输出格式:**
### 核心概念
列出并解释涵盖的主要概念

### 知识框架
以结构化方式组织关键信息

### 关键要点
需要记住的重要观点

### 扩展与应用
如何应用或扩展这些知识`
            },
            decide: {
                system: `你是一个决策支持分析师。提取帮助用户做出明智决定的信息。

指导原则：
- 清晰列出优缺点
- 提取关键数据和事实
- 突出风险和注意事项
- 客观呈现信息
- 包含可操作的见解
- 使用与原文相同的语言`,
                user: `请分析以下网页内容，为决策提供支持。

**页面标题:** ${pageTitle}

**内容:**
${pageContent}

**输出格式:**
### 摘要
内容简要概述

### 关键数据/事实
重要的数字、日期、统计数据或事实信息

### 优点/好处
积极方面或好处的列表

### 缺点/风险
消极方面、缺点或风险的列表

### 建议/注意事项
做决定时需要考虑的关键因素`
            }
        };

        const prompt = prompts[mode] || prompts.quick;

        return [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user }
        ];
    }

    handleAPIError(status, errorData) {
        let message = errorData.error?.message || `HTTP ${status}: 未知错误`;

        switch (status) {
            case 401:
                message = 'API Key 无效或已过期，请在设置中检查。';
                break;
            case 402:
            case 403:
                message = 'API 配额或余额已用尽，请检查您的账户。';
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

        this.showError(message);
    }
    
    showSummary(summary) {
        this.hideLoading();
        this.summaryElement.textContent = summary;
        this.mainView.classList.remove('hidden');
    }
    
    showLoading() {
        this.loadingElement.classList.remove('hidden');
        this.summaryElement.textContent = '';
        this.errorElement.classList.add('hidden');
    }
    
    hideLoading() {
        this.loadingElement.classList.add('hidden');
    }
    
    showError(message, showSettings = false) {
        this.hideLoading();
        this.errorElement.textContent = message;
        this.errorElement.classList.remove('hidden');
        
        if (showSettings) {
            // Show settings button in error state
            this.settingsBtn.style.display = 'block';
        }
    }
    
    hideError() {
        this.errorElement.classList.add('hidden');
    }
    
    async copySummary() {
        try {
            await navigator.clipboard.writeText(this.summaryElement.textContent);
            // Show temporary success message
            const originalText = this.copyBtn.textContent;
            this.copyBtn.textContent = '✅ 已复制';
            setTimeout(() => {
                this.copyBtn.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Copy failed:', error);
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuickReadPopup();
});