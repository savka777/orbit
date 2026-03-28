import { useState, useCallback, useMemo, useRef } from 'react'
import { useOllama } from './useOllama'
import { useLLMFit } from './useLLMFit'
import { mergeModels, sortModels } from '../utils/modelAdapter'
import type { Model } from '../types/models'
import type { SystemProfile } from '../types/llmfit'
import type { OllamaStatus } from '../types/ollama'

export function useModels() {
  const ollama = useOllama()
  const llmfit = useLLMFit()
  const [hasScanRun, setHasScanRun] = useState(false)

  const scanAndRecommendRef = useRef(llmfit.scanAndRecommend)
  scanAndRecommendRef.current = llmfit.scanAndRecommend

  const triggerScan = useCallback(async () => {
    if (hasScanRun) return
    setHasScanRun(true)
    await scanAndRecommendRef.current()
  }, [hasScanRun])

  const models: Model[] = useMemo(() => {
    const merged = mergeModels(ollama.models, llmfit.scoredModels)
    return sortModels(merged)
  }, [ollama.models, llmfit.scoredModels])

  const pullModel = useCallback((name: string) => {
    ollama.pullModel(name)
  }, [ollama.pullModel])

  const deleteModel = useCallback(async (name: string) => {
    await ollama.deleteModel(name)
  }, [ollama.deleteModel])

  return {
    models,
    downloadProgress: ollama.downloadProgress,
    ollamaStatus: ollama.status as OllamaStatus,
    ollamaLoading: ollama.isLoading,
    systemProfile: llmfit.systemProfile as SystemProfile | null,
    isScanning: llmfit.isScanning,
    scanError: llmfit.error,
    hasScanRun,
    triggerScan,
    pullModel,
    deleteModel,
  }
}
