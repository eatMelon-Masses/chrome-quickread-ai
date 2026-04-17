// QuickRead AI Content Extractor
// Uses Readability algorithm to extract main content from web pages

class QuickReadContentExtractor {
    constructor() {
        this.minContentLength = 300;
        this.maxContentLength = 50000;
    }

    extractContent() {
        try {
            // Try to use built-in Readability if available (Firefox)
            if (typeof Readability !== 'undefined') {
                const article = new Readability(document).parse();
                if (article && article.textContent) {
                    return this.cleanContent(article.textContent);
                }
            }

            // Fallback to custom extraction logic
            return this.extractWithCustomLogic();

        } catch (error) {
            console.error('Content extraction failed:', error);
            return null;
        }
    }

    extractWithCustomLogic() {
        // Remove script, style, and other non-content elements
        const clone = document.body.cloneNode(true);

        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'noscript', 'iframe', 'object', 'embed',
            'nav', 'header', 'footer', 'aside', 'form',
            '.ad', '.advertisement', '.ads', '.banner',
            '.comment', '.comments', '.disqus', '#disqus',
            '.social', '.share', '.sharing',
            '.sidebar', '.widget', '.related',
            '.popup', '.modal', '.overlay'
        ];

        unwantedSelectors.forEach(selector => {
            const elements = clone.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });

        // Get text content
        let text = clone.innerText || clone.textContent || '';

        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();

        if (text.length < this.minContentLength) {
            return null;
        }

        return this.cleanContent(text);
    }

    cleanContent(content) {
        // Truncate if too long
        if (content.length > this.maxContentLength) {
            content = content.substring(0, this.maxContentLength);
            // Try to end at a sentence boundary
            const lastPeriod = content.lastIndexOf('.');
            const lastExclamation = content.lastIndexOf('!');
            const lastQuestion = content.lastIndexOf('?');
            const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

            if (lastSentenceEnd > this.maxContentLength * 0.8) {
                content = content.substring(0, lastSentenceEnd + 1);
            }
        }

        return content.trim();
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
        const extractor = new QuickReadContentExtractor();
        const content = extractor.extractContent();
        sendResponse({ content: content });
    }
    return true; // Keep message channel open for async response
});
