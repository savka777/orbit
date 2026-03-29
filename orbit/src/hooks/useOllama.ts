import { useState, useEffect, useCallback } from 'react'
import type { OllamaModel, OllamaStatus } from '../types/ollama'

function hasOrbit() { return typeof window !== 'undefined' && !!window.orbit }

export function useOllama() {
  const [status, setStatus] = useState<OllamaStatus>('installed-not-running')
  const [models, setModels] = useState<OllamaModel[]>([])
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(hasOrbit())
  const [error, setError] = useState<Error | null>(null)

  const refreshModels = useCallback(async () => {
    if (!hasOrbit()) return
    try {
      const response = await window.orbit.listOllamaModels()
      setModels(response.models)
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
        let s = await window.orbit.checkOllamaStatus()
        if (cancelled) return

        if (s === 'installed-not-running') {
          const started = await window.orbit.startOllama()
          if (cancelled) return
          if (started) s = 'running'
        }

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
    if (!hasOrbit() || typeof window.orbit.onPullProgress !== 'function') return
    const cleanup = window.orbit.onPullProgress((data) => {
      const typed = data as { modelName: string; progress: { status: string; total?: number; completed?: number } }
      if (typed.progress.status === 'success') {
        setDownloadProgress((prev) => {
          const next = { ...prev }
          delete next[typed.modelName]
          return next
        })
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

  const deleteModel = useCallback(async (name: string) => {
    if (!hasOrbit()) return
    await window.orbit.deleteModel(name)
    await refreshModels()
  }, [refreshModels])

  return { status, models, downloadProgress, isLoading, error, pullModel, deleteModel, refreshModels }
}
