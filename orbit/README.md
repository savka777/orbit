# Orbit

**Your AI, your rules.**

Run AI models on your own hardware. No cloud. No subscriptions. No one reading your conversations. Just you and an AI that lives on your machine.

Orbit is a macOS desktop app that makes local AI simple. It scans your hardware, recommends the best model for your system, and lets you chat — with web search built in. Everything runs locally through [Ollama](https://ollama.com).

---

**What it does**

- Detects your hardware and recommends models that actually run well on it
- Downloads and manages local models — one click
- Chat with streaming responses and markdown rendering
- Web search built in — ask about weather, news, anything current
- Your conversations stay on your machine. Period.

---

**Get started**

```bash
# Install Ollama first
brew install ollama

# Clone and run
git clone https://github.com/savka777/orbit.git
cd orbit/orbit
npm install
npm run dev:electron
```

Orbit auto-detects Ollama on launch. If you already have models, you're ready to chat.

---

**Built with** Electron, React, TypeScript, Tailwind CSS, Ollama, LLMFit, Open-Meteo

**License** MIT
