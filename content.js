// QuickRead AI Content Extractor
// Extracts selected text or the most likely main article content from a page.

(() => {
    if (window.__quickReadContentScriptLoaded) {
        return;
    }
    window.__quickReadContentScriptLoaded = true;

    class QuickReadContentExtractor {
        constructor() {
            this.minContentLength = 300;
            this.minSelectionLength = 80;
            this.maxContentLength = 50000;
            this.unwantedSelectors = [
                'script', 'style', 'noscript', 'iframe', 'object', 'embed',
                'nav', 'header', 'footer', 'aside', 'form', 'button', 'input',
                'textarea', 'select', 'svg', 'canvas', '[hidden]',
                '[aria-hidden="true"]', '[role="navigation"]', '[role="banner"]',
                '[role="contentinfo"]', '[role="complementary"]',
                '.ad', '.advertisement', '.ads', '.banner', '.sponsor',
                '.comment', '.comments', '.disqus', '#disqus',
                '.social', '.share', '.sharing',
                '.sidebar', '.widget', '.related', '.recommend', '.recommended',
                '.popup', '.modal', '.overlay', '.cookie', '.cookies',
                '.newsletter', '.subscribe', '.breadcrumb', '.breadcrumbs',
                '.pagination', '.pager', '.menu', '.nav', '.toc'
            ];
            this.candidateSelectors = [
                'article',
                'main',
                '[role="main"]',
                '.article',
                '.article-content',
                '.article-body',
                '.post',
                '.post-content',
                '.post-body',
                '.entry-content',
                '.content',
                '#content',
                '.main-content',
                '#main-content',
                '.story',
                '.story-body'
            ];
        }

        extractContent() {
            try {
                const selectedText = this.getSelectedText();
                if (selectedText.length >= this.minSelectionLength) {
                    return this.buildResult(this.cleanContent(selectedText), 'selection');
                }

                const content = this.extractFromCandidates() || this.extractFromBody();
                if (!content || content.length < this.minContentLength) {
                    console.warn('[QuickRead] Content too short after extraction');
                    return { content: null, sourceType: 'page', metadata: this.extractMetadata('') };
                }

                const cleaned = this.cleanContent(content);
                console.log('[QuickRead] Content extracted:', cleaned.length, 'chars');
                return this.buildResult(cleaned, 'page');
            } catch (error) {
                console.error('[QuickRead] Content extraction failed:', error);
                return { content: null, sourceType: 'page', metadata: this.extractMetadata('') };
            }
        }

        getSelectedText() {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                return '';
            }
            return this.normalizeText(selection.toString());
        }

        extractFromCandidates() {
            const clone = document.body?.cloneNode(true);
            if (!clone) {
                return '';
            }

            this.removeUnwantedElements(clone);

            const candidates = [
                ...this.candidateSelectors.flatMap(selector => Array.from(clone.querySelectorAll(selector))),
                clone
            ];

            let bestCandidate = null;
            let bestScore = 0;

            candidates.forEach(candidate => {
                const text = this.extractStructuredText(candidate);
                if (text.length < this.minContentLength) {
                    return;
                }

                const score = this.scoreCandidate(candidate, text);
                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = { element: candidate, text };
                }
            });

            return bestCandidate ? bestCandidate.text : '';
        }

        extractFromBody() {
            const clone = document.body?.cloneNode(true);
            if (!clone) {
                return '';
            }

            this.removeUnwantedElements(clone);
            return this.extractStructuredText(clone);
        }

        removeUnwantedElements(root) {
            this.unwantedSelectors.forEach(selector => {
                root.querySelectorAll(selector).forEach(element => element.remove());
            });

            root.querySelectorAll('*').forEach(element => {
                const style = window.getComputedStyle(element);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    element.remove();
                }
            });
        }

        extractStructuredText(root) {
            const blockSelectors = 'h1,h2,h3,p,li,blockquote,pre,td,th';
            const blocks = Array.from(root.querySelectorAll(blockSelectors));
            const lines = blocks
                .map(block => this.normalizeText(block.innerText || block.textContent || ''))
                .filter(text => text.length > 1);

            if (lines.length >= 3) {
                return this.dedupeLines(lines).join('\n');
            }

            return this.normalizeText(root.innerText || root.textContent || '');
        }

        dedupeLines(lines) {
            const seen = new Set();
            return lines.filter(line => {
                const key = line.toLowerCase();
                if (line.length < 80 && seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            });
        }

        scoreCandidate(element, text) {
            const linkTextLength = Array.from(element.querySelectorAll('a'))
                .reduce((total, link) => total + this.normalizeText(link.textContent || '').length, 0);
            const linkDensity = text.length ? linkTextLength / text.length : 0;
            const paragraphCount = element.querySelectorAll('p').length;
            const headingCount = element.querySelectorAll('h1,h2,h3').length;
            const punctuationCount = (text.match(/[。！？.!?；;，,]/g) || []).length;

            let score = text.length;
            score += paragraphCount * 180;
            score += headingCount * 80;
            score += punctuationCount * 8;
            score -= linkDensity * text.length * 1.5;

            const tagName = element.tagName?.toLowerCase();
            if (tagName === 'article') {
                score += 900;
            } else if (tagName === 'main') {
                score += 700;
            }
            if (element.getAttribute('role') === 'main') {
                score += 500;
            }

            return score;
        }

        cleanContent(content) {
            let cleaned = this.normalizeText(content);

            if (cleaned.length > this.maxContentLength) {
                cleaned = cleaned.substring(0, this.maxContentLength);
                const sentenceEnds = ['.', '!', '?', '。', '！', '？'];
                const lastSentenceEnd = Math.max(...sentenceEnds.map(mark => cleaned.lastIndexOf(mark)));

                if (lastSentenceEnd > this.maxContentLength * 0.8) {
                    cleaned = cleaned.substring(0, lastSentenceEnd + 1);
                }
            }

            return cleaned.trim();
        }

        normalizeText(text) {
            return text
                .replace(/\r/g, '\n')
                .replace(/[ \t\f\v]+/g, ' ')
                .replace(/\n[ \t]+/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .join('\n')
                .trim();
        }

        buildResult(content, sourceType) {
            return {
                content,
                sourceType,
                metadata: this.extractMetadata(content)
            };
        }

        extractMetadata(content) {
            const meta = selector => document.querySelector(selector)?.getAttribute('content')?.trim() || '';
            const title = meta('meta[property="og:title"]') || meta('meta[name="twitter:title"]') || document.title || '';
            const siteName = meta('meta[property="og:site_name"]') || location.hostname;
            const description = meta('meta[name="description"]') || meta('meta[property="og:description"]') || '';
            const author = meta('meta[name="author"]') || meta('meta[property="article:author"]') || '';
            const wordCount = this.estimateWordCount(content);

            return {
                title,
                siteName,
                description,
                author,
                url: location.href,
                lang: document.documentElement.lang || '',
                charCount: content.length,
                wordCount,
                readingMinutes: wordCount ? Math.max(1, Math.ceil(wordCount / 450)) : 0
            };
        }

        estimateWordCount(text) {
            const latinWords = text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g) || [];
            const cjkChars = text.match(/[\u3400-\u9FFF\uF900-\uFAFF]/g) || [];
            return latinWords.length + Math.ceil(cjkChars.length / 2);
        }
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'extractContent') {
            const extractor = new QuickReadContentExtractor();
            sendResponse(extractor.extractContent());
        }
    });
})();
