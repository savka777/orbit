<h1 align="center">⚡ Orbit</h1>

<p align="center">
  <strong>your ai, your rules.</strong>
</p>

<p align="center">
  The local AI desktop app that scans your hardware, recommends the best models, and runs them privately on your machine. No cloud. No subscription. No data leaving your device.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#research">Research</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-macOS-black?style=flat-square" />
  <img src="https://img.shields.io/badge/built%20with-Electron%20%2B%20React-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/models-Ollama-green?style=flat-square" />
  <img src="https://img.shields.io/badge/license-MIT-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/status-alpha-red?style=flat-square" />
</p>

---

## Why Orbit?

Running AI locally should be simple. Today it's not — you need to know which models fit your hardware, wrestle with CLI tools, and settle for clunky interfaces.

Orbit fixes this. It scans your machine, tells you exactly what you can run, downloads models in one click, and gives you a beautiful interface to use them. Everything stays on your device.

**For people who want AI without giving up their privacy, their money, or their sanity.**

---

## Features

🔍 **Hardware-Aware Model Matching**
Orbit scans your CPU, GPU, and RAM, then recommends models that will actually run well on your hardware. No guessing. No crashes.

💬 **Threaded Conversations**
Slack-style threads for AI. Branch any message into a side conversation without losing context. Organize your thinking.

⚡ **One-Click Model Management**
Browse, download, and switch between models instantly. Filter by size, capability, or what fits your machine.

🔒 **Fully Private**
Everything runs locally via Ollama. Your conversations never leave your device. No accounts. No telemetry.

🛠️ **MCP Tool Integration** *(coming soon)*
Connect your AI to your filesystem, browser, calendar, and more through the Model Context Protocol.

🎨 **Designed to Feel Premium**
Inspired by the Codex desktop app aesthetic. Dark, focused, professional. Not another developer tool — a product.

---

## Screenshots

<p align="center">
  <img src="docs/screenshot-welcome.png" alt="Welcome Screen" width="80%" />
  <br />
  <em>Welcome — clean, focused, ready to go</em>
</p>

<p align="center">
  <img src="docs/screenshot-models.png" alt="Model Library" width="80%" />
  <br />
  <em>Hardware scan + intelligent model recommendations</em>
</p>

---

## Getting Started

### Prerequisites

- macOS (Apple Silicon recommended)
- [Ollama](https://ollama.com) installed and running
- Node.js 18+

### Install & Run

```bash
git clone https://github.com/savka777/orbit.git
cd orbit/orbit
npm install
npm run dev:electron
```

Orbit will launch, detect your hardware, and recommend models you can run.

### Build for Distribution

```bash
npm run build:electron
```

Produces a `.dmg` in `release/`.

---

## Roadmap

### Now
- [x] Hardware detection and model recommendations
- [x] One-click model download and management
- [x] Streaming chat with local models
- [x] Multi-conversation support
- [x] Threaded conversations

### Next
- [ ] **TurboQuant integration** — 6x KV cache compression, run bigger models on the same hardware ([paper](https://arxiv.org/abs/2504.19874))
- [ ] **MCP tool support** — connect your AI to files, browser, calendar, code execution
- [ ] **Uncensored model support** — Dolphin and other unfiltered models, prominently featured
- [ ] **Conversation branching** — hover any message, start a side thread
- [ ] **Model performance dashboard** — real-time tok/s, VRAM usage, temperature

### Future
- [ ] **Orbit Spaces** — separate workspaces with different models, tools, and system prompts
- [ ] **Plugin marketplace** — community-built MCP tool packages
- [ ] **Cross-platform** — Windows and Linux support
- [ ] **Model fine-tuning** — LoRA training from within the app

---

## Research

Orbit is built at the intersection of product and research. We're actively integrating cutting-edge work:

### TurboQuant (Google Research, 2026)

Google's [TurboQuant](https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/) achieves 6x KV cache compression with zero quality loss through PolarQuant (polar coordinate quantization) and QJL (1-bit error correction). Community ports to [Apple Silicon MLX](https://www.reddit.com/r/LocalLLaMA/comments/1s36vnk/looking_for_feedback_porting_googles_turboquant/) are already showing 42% memory reduction with perfect coherence.

We're integrating TurboQuant into Orbit's inference pipeline to dramatically expand what models your hardware can handle.

**Papers:**
- [TurboQuant: Extreme KV Cache Compression](https://arxiv.org/abs/2504.19874)
- [PolarQuant: Polar Coordinate Quantization](https://arxiv.org/pdf/2502.02617)
- [QJL: 1-bit Johnson-Lindenstrauss](https://arxiv.org/abs/2406.03482)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion + GSAP |
| 3D | Three.js (welcome screen shader) |
| Models | Ollama |
| Hardware | Custom `llmfit` binary |
| Build | Vite + electron-builder |

---

## Contributing

Orbit is open source and contributions are welcome.

### How to Contribute

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas We Need Help

- **TurboQuant integration** — porting PolarQuant + QJL to the Ollama/llama.cpp inference layer
- **MCP client implementation** — TypeScript MCP client in Electron main process
- **Cross-platform support** — Windows and Linux testing
- **Model compatibility** — testing with different model formats and architectures

### Development

```bash
cd orbit/orbit
npm run dev              # Vite dev server
npm run dev:electron     # Full Electron + Vite
npm run build            # Production build
npm run lint             # ESLint
```

---

## Mission

AI is becoming essential infrastructure. But right now, using it means sending your thoughts, your code, your private conversations to someone else's server — and paying for the privilege.

Orbit exists because we believe your AI should run on your hardware, under your control, with your choice of model. No filters you didn't ask for. No subscription you can't cancel. No data you can't delete.

**Your AI. Your rules.**

---

## License

MIT — do whatever you want with it.

---

<p align="center">
  Built by <a href="https://x.com/savboj">@savboj</a>
</p>
