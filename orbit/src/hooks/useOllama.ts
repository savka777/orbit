import { useState, useEffect, useCallback, useRef } from 'react'
import type { OllamaStatus } from '../types/ollama'
import type { ScoredModel } from '../types/llmfit'
import type { Model } from '../types/models'
import { mapOllamaModel } from '../utils/modelAdapter'

function hasOrbit() { return typeof window !== 'undefined' && !!window.orbit }

export function useOllama(scoredModels?: ScoredModel[]) {
  const [status, setStatus] = useState<OllamaStatus>('installed-not-running')
  const [models, setModels] = useState<Model[]>([])
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(hasOrbit())
  const [error, setError] = useState<Error | null>(null)

  const scoredModelsRef = useRef(scoredModels)
  scoredModelsRef.current = scoredModels

  const refreshModels = useCallback(async () => {
    if (!hasOrbit()) return
    try {
      const response = await window.orbit.listOllamaModels()
      const mapped = response.models.map((m) => mapOllamaModel(m, scoredModelsRef.current))
      setModels(mapped)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    }
  }, [])

  useEffect(() => {
    if (!hasOrbit()) return
    let cancelled = false
    async function init() {
      setIsLoading(true)
      try {
        const s = await window.orbit.checkOllamaStatus()
        if (cancelled) return
        setStatus(s)
        if (s === 'running') { await refreshModels() }
      } catch (err) {
        if (!cancelled) { setError(err instanceof Error ? err : new Error(String(err))) }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [refreshModels])

  useEffect(() => {
    if (!hasOrbit()) return
    const cleanup = window.orbit.onPullProgress((data) => {
      const typed = data as { modelName: string; progress: { status: string; total?: number; completed?: number } }
      if (typed.progress.status === 'success') {
        setDownloadProgress((prev) => ({ ...prev, [typed.modelName]: 100 }))
        refreshModels()
        return
      }
      if (typed.progress.total && typed.progress.completed) {
        const pct = Math.round((typed.progress.completed / typed.progress.total) * 100)
        setDownloadProgress((prev) => ({ ...prev, [typed.modelName]: pct }))
      }
    })
    return cleanup
  }, [refreshModels])

  const pullModel = useCallback((name: string) => {
    if (!hasOrbit()) return
    window.orbit.pullModel(name)
  }, [])

  return { status, models, downloadProgress, isLoading, error, pullModel, refreshModels }
}
