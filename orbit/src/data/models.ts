/**
 * Curated model catalog for Orbit.
 *
 * Each model is hand-picked for quality, Ollama availability, and tool-calling
 * support. Filtered at runtime by the user's available RAM.
 */

export type CuratedModel = {
  ollamaId: string        // Exact Ollama pull/tag name
  name: string            // Display name
  provider: string        // Who made it
  parameterCount: string  // e.g. "4B"
  ramRequired: number     // GB of RAM needed to run comfortably
  description: string     // One-liner for consumers
  toolCalling: boolean    // Supports Ollama's native tools API
  category: 'general' | 'code' | 'reasoning'
}

export const curatedModels: CuratedModel[] = [
  // ── General Purpose (what most consumers want) ──────────────────
  {
    ollamaId: 'qwen3:4b',
    name: 'Qwen 3',
    provider: 'Alibaba',
    parameterCount: '4B',
    ramRequired: 4,
    description: 'Fast and smart. Great for everyday conversations and tasks.',
    toolCalling: true,
    category: 'general',
  },
  {
    ollamaId: 'llama3.2:3b',
    name: 'Llama 3.2',
    provider: 'Meta',
    parameterCount: '3B',
    ramRequired: 3,
    description: 'Lightweight and quick. Good for simple questions and chat.',
    toolCalling: false,
    category: 'general',
  },
  {
    ollamaId: 'mistral:7b',
    name: 'Mistral',
    provider: 'Mistral AI',
    parameterCount: '7B',
    ramRequired: 6,
    description: 'Well-rounded model. Solid at reasoning and writing.',
    toolCalling: true,
    category: 'general',
  },
  {
    ollamaId: 'qwen2.5:7b',
    name: 'Qwen 2.5',
    provider: 'Alibaba',
    parameterCount: '7B',
    ramRequired: 6,
    description: 'Strong all-rounder with great multilingual support.',
    toolCalling: true,
    category: 'general',
  },
  {
    ollamaId: 'gemma3:4b',
    name: 'Gemma 3',
    provider: 'Google',
    parameterCount: '4B',
    ramRequired: 4,
    description: 'Compact and capable. Built by Google for everyday use.',
    toolCalling: true,
    category: 'general',
  },
  {
    ollamaId: 'phi4-mini',
    name: 'Phi 4 Mini',
    provider: 'Microsoft',
    parameterCount: '3.8B',
    ramRequired: 4,
    description: 'Punches above its weight. Surprisingly smart for its size.',
    toolCalling: true,
    category: 'general',
  },
  {
    ollamaId: 'llama3.1:8b',
    name: 'Llama 3.1',
    provider: 'Meta',
    parameterCount: '8B',
    ramRequired: 6,
    description: 'More capable Llama. Better at complex tasks and reasoning.',
    toolCalling: true,
    category: 'general',
  },
  {
    ollamaId: 'qwen3:8b',
    name: 'Qwen 3',
    provider: 'Alibaba',
    parameterCount: '8B',
    ramRequired: 7,
    description: 'Top-tier for its size. Excellent at following instructions.',
    toolCalling: true,
    category: 'general',
  },

  // ── Code (hidden by default, shown in "Show all") ──────────────
  {
    ollamaId: 'qwen2.5-coder:7b',
    name: 'Qwen 2.5 Coder',
    provider: 'Alibaba',
    parameterCount: '7B',
    ramRequired: 6,
    description: 'Purpose-built for writing and understanding code.',
    toolCalling: true,
    category: 'code',
  },
  {
    ollamaId: 'deepseek-coder:6.7b',
    name: 'DeepSeek Coder',
    provider: 'DeepSeek',
    parameterCount: '6.7B',
    ramRequired: 5,
    description: 'Strong coding model. Understands 80+ languages.',
    toolCalling: false,
    category: 'code',
  },

  // ── Reasoning (hidden by default) ──────────────────────────────
  {
    ollamaId: 'deepseek-r1:7b',
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    parameterCount: '7B',
    ramRequired: 6,
    description: 'Thinks step by step. Best for math and logic puzzles.',
    toolCalling: false,
    category: 'reasoning',
  },
]

/**
 * Filter the curated catalog by available RAM and return general-purpose
 * models that will actually run well on this machine.
 */
export function getRecommendedModels(availableRamGb: number): CuratedModel[] {
  return curatedModels
    .filter(m => m.category === 'general' && m.ramRequired <= availableRamGb)
    .sort((a, b) => {
      // Prefer tool-calling models, then by size (bigger = better quality)
      if (a.toolCalling !== b.toolCalling) return a.toolCalling ? -1 : 1
      return b.ramRequired - a.ramRequired
    })
}

/**
 * Get all models that fit in RAM (for "Show all" view).
 */
export function getAllFittingModels(availableRamGb: number): CuratedModel[] {
  return curatedModels
    .filter(m => m.ramRequired <= availableRamGb)
    .sort((a, b) => b.ramRequired - a.ramRequired)
}
