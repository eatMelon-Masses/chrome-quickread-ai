// QuickRead AI Intent Prompts

const QUICKREAD_PROMPTS = {
    quick: {
        system: '你是一个信息提取助手。请从以下文章中提取 3-5 个核心要点，并在最后用一句话总结。保持客观，每个要点不超过 30 字。',
        format: '要点列表 + 「💡 一句话：xxx」'
    },
    learn: {
        system: '你是一个知识整理助手。请识别文章中的核心概念和知识框架，结构化呈现。解释关键术语，指出逻辑关系。',
        format: '知识卡片 + 结构化大纲'
    },
    decide: {
        system: '你是一个决策分析助手。请从文章中提取对决策有用的信息：优缺点对比、关键数据、风险提示。',
        format: '对比表格 + 决策建议'
    }
};

// Helper function to get prompt by mode
function getIntentPrompt(mode) {
    return QUICKREAD_PROMPTS[mode]?.system || QUICKREAD_PROMPTS.quick.system;
}

// Helper function to get expected output format
function getOutputFormat(mode) {
    return QUICKREAD_PROMPTS[mode]?.format || QUICKREAD_PROMPTS.quick.format;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { QUICKREAD_PROMPTS, getIntentPrompt, getOutputFormat };
}