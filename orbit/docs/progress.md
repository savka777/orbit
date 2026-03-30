# Orbit — Progress Summary

## What We Built

Orbit is a macOS desktop app for running AI models locally. Over two days of development, it went from a mock-only UI prototype to a working product with real model management, chat with streaming, web search, and a consumer-friendly interface.

### Core Features

**Model Management**
- Curated catalog of 12 hand-picked models (Qwen 3, Llama 3.2, Mistral, Gemma 3, Phi 4, etc.) with consumer-friendly descriptions
- Hardware scan via LLMFit detects system RAM, CPU, GPU — recommendations filtered by what fits
- One-click download from Ollama with progress tracking
- Model deletion to free disk space
- LLMFit's full 200+ model catalog available in "Show all" for power users

**Chat**
- Real streaming responses via Ollama API
- Markdown rendering with syntax-highlighted code blocks (react-markdown + react-syntax-highlighter)
- Conversations persist to localStorage across reloads
- User messages right-aligned in bubbles, assistant messages left with Orbit icon

**Tool Calling**
- Ollama's native `tools` API for structured function calling
- Built-in tools: web search (DuckDuckGo HTML scrape) and weather (Open-Meteo API)
- Graceful fallback for models without tool support (plain streaming)
- Models with tool support get a "Tools" badge in the catalog

**UI/UX**
- Merged Hardware + Models into one unified tab (sidebar: Models, Tools, Settings)
- LiquidGradient WebGL featured card for top recommended model
- General-purpose models shown by default, specialists hidden behind toggle
- Welcome screen adapts to Ollama state (auto-start, loading, no models nudge)
- Toast notifications for download completion
- Settings screen with "Delete all data" button

### Architecture

```
Renderer (React + TypeScript + Tailwind)
    ↕ Electron IPC
Main Process (Node.js)
    ├── ollama.ts — Ollama HTTP API (chat, pull, delete, status)
    ├── search.ts — DuckDuckGo scraper
    ├── llmfit.ts — LLMFit CLI wrapper (hardware scan)
    └── main.ts  — IPC handlers, window management
```

Key hooks: `useModels()` (unified model state), `useOllama()` (pure Ollama API), `useLLMFit()` (hardware scanner), `useChat()` (streaming chat with IPC listeners), `useAppState()` (navigation, conversations, localStorage).

---

## Where We Are Now

### What Works
- Download models from curated catalog → chat with them → streaming responses
- Weather queries return real data via Open-Meteo (when model supports tools)
- Web search via DuckDuckGo for current events
- Conversations persist across app restarts
- Hardware scan shows system specs and filters model recommendations by RAM

### What Needs Work
- **Model name mapping is fragile** — LLMFit returns HuggingFace names, Ollama uses its own tags. We have a manual mapping table for ~20 models and a fallback heuristic, but it doesn't cover everything. LLMFit models in the "More compatible models" section can't be downloaded without manual Ollama setup.
- **Tool calling only works with compatible models** — llama3.2:3b works, deepseek-coder:6.7b does not. The app falls back to plain chat but doesn't tell the user which models support tools.
- **No test for the Electron IPC layer** — hooks and utilities are tested (41 tests), but the main process code (streamChat, pullModel, tool execution) has no tests.
- **Consumer UX still needs polish** — the model catalog uses technical names and sizes. A true consumer app would abstract away "7B", "3B", "4 GB RAM" into simple tiers like "Fast", "Balanced", "Powerful".
- **MCP integration is designed but not built** — the MCPTools screen exists with mock data. Real MCP server management (spawn, discover tools, route calls) is the next phase.
- **No onboarding walkthrough** — new users land on Welcome and figure it out. A guided first-run experience would help.

### Open Feature Ideas
- MCP server integration (Phase 2 from research)
- Conversation search and organization
- Model switching mid-conversation
- Export conversations
- System prompt customization per model

---

## Lessons Learned

### Technical

**LLMFit ≠ Ollama.** LLMFit scores models from HuggingFace/MLX ecosystem by hardware fit. Ollama has its own model registry with different names and tags. Trying to bridge them with name normalization is brittle. Better approach: curate the model list ourselves with known Ollama IDs, use LLMFit only for hardware detection.

**Prompt-based tool calling is unreliable with small models.** The `<search>query</search>` approach worked maybe 60% of the time with deepseek-coder:6.7b. It hallucinated answers before searching, used wrong tag formats, and ignored instructions. Ollama's native `tools` API with a compatible model (llama3.2:3b) works reliably on the first try.

**Character-by-character IPC floods kill React.** Streaming tokens from Ollama and sending each character as a separate IPC message caused hundreds of React re-renders per second. Combined with react-markdown (expensive to re-parse), the UI froze until streaming completed. Fix: batch tokens per Ollama chunk.

**The .cjs/.ts dual file problem.** Electron loads `.cjs` files at runtime but we write `.ts` source. Every change needs to be synced to both files. This is error-prone and should be replaced with a proper build step.

**`stream: false` for tool calls, `stream: true` for final response.** Ollama's streaming with tool calls is inconsistent. The reliable pattern: non-streaming request to get structured `tool_calls`, execute them, then stream the final response with results in context.

### Product

**Consumers don't know model names.** Showing "Qwen 2.5 7B Instruct Q4_K_M" means nothing to a regular user. "Fast and smart. Great for everyday conversations" is what they need. The curated catalog with human descriptions was the right move.

**Hardware tab and Models tab were the same thing.** Users don't think in terms of "hardware diagnostics" vs "model management". They think "what can I run?" — one screen, system specs at top, recommendations below.

**The featured card matters.** The LiquidGradient WebGL card for the top recommendation gives the Models screen visual hierarchy and makes the "just pick this one" choice obvious. Removing it made the screen feel flat.

**Default to less, reveal more.** Showing 200 LLMFit models overwhelms. Showing 5-6 curated general-purpose picks with a "Show all" toggle is the right balance.

**Tool calling is a feature, not a default.** Most chat interactions don't need web search or weather. The system prompt should be minimal, and tools should activate only when the model decides it needs them (which the native API handles correctly).
