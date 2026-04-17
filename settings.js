// QuickRead AI Settings Script

class QuickReadSettings {
    constructor() {
        this.providers = {
            openai: {
                name: 'OpenAI',
                baseURL: 'https://api.openai.com/v1',
                getKeyUrl: 'https://platform.openai.com/api-keys'
            },
            qwen: {
                name: '通义千问',
                baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
                getKeyUrl: 'https://dashscope.console.aliyun.com/apiKey'
            },
            deepseek: {
                name: 'DeepSeek',
                baseURL: 'https://api.deepseek.com/v1',
                getKeyUrl: 'https://platform.deepseek.com/api_keys'
            },
            custom: {
                name: '自定义',
                baseURL: '',
                getKeyUrl: ''
            }
        };
        
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
        this.getKeyLink = document.getElementById('get-key-link');
        this.saveBtn = document.getElementById('save-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.testBtn = document.getElementById('test-btn');
        this.testResult = document.getElementById('test-result');
        this.testResultContent = document.getElementById('test-result-content');
        this.testResultClose = document.getElementById('test-result-close');
        this.statusMessage = document.getElementById('status-message');
        this.settingsForm = document.getElementById('settings-form');
    }

    bindEvents() {
        this.providerSelect.addEventListener('change', () => {
            this.updateProviderInfo();
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

        this.testResultClose.addEventListener('click', () => {
            this.hideTestResult();
        });
    }
    
    updateProviderInfo() {
        const provider = this.providerSelect.value;
        const providerInfo = this.providers[provider];
        
        // Show/hide custom URL input based on provider selection
        if (provider === 'custom') {
            this.baseUrlGroup.style.display = 'block';
            this.getKeyLink.style.display = 'none';
        } else {
            this.baseUrlGroup.style.display = 'none';
            this.baseUrlInput.value = providerInfo.baseURL;
            this.getKeyLink.style.display = 'inline';
            this.getKeyLink.href = providerInfo.getKeyUrl;
            this.getKeyLink.textContent = `获取 ${providerInfo.name} API Key`;
        }
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get([
                'provider', 
                'apiKey', 
                'model',
                'baseUrl'
            ]);
            
            if (result.provider) {
                this.providerSelect.value = result.provider;
                this.updateProviderInfo();
            }
            
            if (result.apiKey) {
                this.apiKeyInput.value = result.apiKey;
            }
            
            if (result.baseUrl) {
                this.baseUrlInput.value = result.baseUrl;
            } else if (this.providerSelect.value !== 'custom') {
                const providerInfo = this.providers[this.providerSelect.value];
                this.baseUrlInput.value = providerInfo?.baseURL || '';
            }
            
            if (result.model) {
                this.modelInput.value = result.model;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus('加载设置失败', false);
        }
    }
    
    async saveSettings() {
        const provider = this.providerSelect.value;
        const apiKey = this.apiKeyInput.value.trim();
        const baseUrl = this.baseUrlInput.value.trim();
        const model = this.modelInput.value.trim();
        
        if (!apiKey) {
            this.showStatus('请输入 API Key', false);
            return;
        }
        
        if (!baseUrl) {
            this.showStatus('请输入 API 基础 URL', false);
            return;
        }
        
        if (!model) {
            this.showStatus('请输入模型名称', false);
            return;
        }
        
        this.setLoading(true);
        this.showStatus('正在验证 API Key...', true);
        
        try {
            // Validate API key with a minimal request
            await this.validateApiKey(baseUrl, apiKey, model);
            
            // Save to storage
            await chrome.storage.local.set({
                provider,
                apiKey,
                baseUrl,
                model,
                hasOnboarded: true
            });
            
            this.showStatus('API Key 验证成功！设置已保存。', true);
            
            // Close settings after 2 seconds
            setTimeout(() => {
                window.close();
            }, 2000);
            
        } catch (error) {
            console.error('Error saving settings:', error);
            if (error.message.includes('invalid_api_key') || error.message.includes('authentication')) {
                this.showStatus('API Key 无效，请检查或更换', false);
            } else if (error.message.includes('quota')) {
                this.showStatus('API 额度不足，请充值或换 Key', false);
            } else if (error.message.includes('timeout')) {
                this.showStatus('请求超时，请检查 URL 和网络连接', false);
            } else {
                this.showStatus('验证失败，请检查 URL 和 API Key', false);
            }
        } finally {
            this.setLoading(false);
        }
    }
    
    async validateApiKey(baseUrl, apiKey, model, testPrompt = 'test') {
        // Make a minimal test request
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: testPrompt }],
                max_tokens: 100,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    async testConnection() {
        const apiKey = this.apiKeyInput.value.trim();
        const baseUrl = this.baseUrlInput.value.trim();
        const model = this.modelInput.value.trim();

        if (!apiKey) {
            this.showStatus('请输入 API Key', false);
            return;
        }

        if (!baseUrl) {
            this.showStatus('请输入 API 基础 URL', false);
            return;
        }

        if (!model) {
            this.showStatus('请输入模型名称', false);
            return;
        }

        this.setTestLoading(true);
        this.showStatus('正在测试连接...', true);

        try {
            const response = await this.validateApiKey(baseUrl, apiKey, model, '你好，请用一句话介绍你自己');
            const content = response.choices?.[0]?.message?.content || JSON.stringify(response, null, 2);

            this.showStatus('连接测试成功！', true);
            this.showTestResult(content);

        } catch (error) {
            console.error('Test connection failed:', error);
            let message = error.message || '测试失败';
            if (error.message.includes('invalid_api_key') || error.message.includes('authentication')) {
                message = 'API Key 无效，请检查或更换';
            } else if (error.message.includes('quota')) {
                message = 'API 额度不足，请充值或换 Key';
            } else if (error.message.includes('timeout')) {
                message = '请求超时，请检查 URL 和网络连接';
            } else if (error.message.includes('404')) {
                message = '模型不存在或 URL 错误';
            }
            this.showStatus(message, false);
            this.showTestResult(`错误：${message}`);
        } finally {
            this.setTestLoading(false);
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
            this.testBtn.textContent = '🧪 测试连接';
        }
    }
    
    async clearSettings() {
        if (confirm('确定要清除所有设置吗？这将删除你的 API Key。')) {
            try {
                await chrome.storage.local.remove([
                    'provider', 
                    'apiKey', 
                    'model',
                    'baseUrl'
                ]);
                this.apiKeyInput.value = '';
                this.baseUrlInput.value = '';
                this.modelInput.value = '';
                this.showStatus('设置已清除', true);
            } catch (error) {
                console.error('Error clearing settings:', error);
                this.showStatus('清除设置失败', false);
            }
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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuickReadSettings();
});