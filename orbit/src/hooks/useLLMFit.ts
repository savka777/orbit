import { useState, useCallback } from 'react'
import type { SystemProfile, ScoredModel } from '../types/llmfit'

function hasOrbit() { return typeof window !== 'undefined' && !!window.orbit }

export function useLLMFit() {
  const [systemProfile, setSystemProfile] = useState<SystemProfile | null>(null)
  const [scoredModels, setScoredModels] = useState<ScoredModel[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const scan = useCallback(async () => {
    if (!hasOrbit()) return
    setError(null)
    setIsScanning(true)
    try {
      const response = await window.orbit.scanHardware()
      setSystemProfile(response.system)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsScanning(false)
    }
  }, [])

  const recommend = useCallback(async () => {
    if (!hasOrbit()) return
    setError(null)
    setIsScanning(true)
    try {
      const response = await window.orbit.recommendModels()
      setSystemProfile(response.system)
      setScoredModels(response.models)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsScanning(false)
    }
  }, [])

  const scanAndRecommend = useCallback(async () => {
    await recommend()
  }, [recommend])

  return { systemProfile, scoredModels, isScanning, error, scan, recommend, scanAndRecommend }
}
