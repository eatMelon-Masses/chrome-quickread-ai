# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuickRead AI is a Chrome extension (Manifest V3) that summarizes web pages using LLM APIs. Users can choose from three modes: quick browsing, learning, or decision support.

## Architecture

- **popup.html/popup.js** - Main UI with mode selector (quick/learn/decide), displays summaries
- **api.js** - Unified API client handling OpenAI, Qwen (Aliyun), DeepSeek providers with retry logic
- **content.js** - Content extractor using Readability API or custom DOM filtering
- **settings.html/settings.js** - Configuration page for API key, provider, model, custom base URL
- **prompts.js** - Shared prompt definitions for the three modes

## Commands

```bash
# Generate PNG icons from scratch
node icons/generate-png.js
```

## Key Patterns

- **Provider abstraction**: All LLM providers use OpenAI-compatible `/chat/completions` endpoint format
- **Content extraction**: Tries native Readability first (Firefox), falls back to custom DOM filtering
- **Communication**: Popup uses `chrome.tabs.sendMessage` to request content extraction from content.js
- **Storage**: Uses `chrome.storage.local` for API config and onboarding state

## Provider Endpoints

| Provider | Base URL |
|----------|----------|
| OpenAI | https://api.openai.com/v1 |
| Qwen | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| DeepSeek | https://api.deepseek.com/v1 |

## Development Notes

- No build step required - pure vanilla JavaScript
- Load extension in Chrome via "Load unpacked" pointing to this directory
- All UI text is in Chinese
