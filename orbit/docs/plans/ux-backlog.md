# UX Backlog — Nice to Haves

Items deferred from the LLMFit integration design. Revisit after MVP ships.

## Error Handling & Resilience

- **Sleep during download:** Request macOS power assertion to prevent sleep during active downloads. Resume on wake if sleep happens anyway.
- **macOS Gatekeeper prompts:** Ensure Electron app is code-signed and notarized so bundled LLMFit binary doesn't trigger security warnings.
- **Ollama version mismatch:** Detect Ollama version on startup, prompt to update if below minimum supported version.
- **First-time permission prompts:** Warn user before macOS network access prompt appears. Reassure that data stays local.

## Performance & Resource Management

- **System under heavy load:** Detect when inference is significantly slower than estimated. Show subtle indicator: "Responses may be slower while your system is busy."
- **Slow model nudge:** After a few messages, if tokens/sec is below threshold, suggest a faster alternative: "This model seems slow on your hardware. Want to try a faster one?"
- **Memory management on model switch:** On low-memory systems (8GB), explicitly unload previous model via Ollama API before loading a new one to avoid memory pressure.

## Ongoing Maintenance

- **Disk space tracking:** Show total disk usage by downloaded models in the hardware/models screen. Offer per-model "Remove" button with confirmation.
- **Hardware re-scan reminders:** Periodic check (on app update or monthly) suggesting re-scan: "Your hardware profile is from 3 months ago. Want to re-scan?"
- **Hardware changes:** Detect when system profile differs from saved profile (e.g., RAM upgrade, new Mac) and prompt re-scan automatically.
