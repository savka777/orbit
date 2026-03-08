import { spawn, ChildProcess } from 'child_process'
import { app } from 'electron'
import path from 'path'
import http from 'http'
import net from 'net'

let llmfitProcess: ChildProcess | null = null
let currentPort: number | null = null

function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr !== 'string') {
        const port = addr.port
        server.close(() => resolve(port))
      } else {
        reject(new Error('Could not find available port'))
      }
    })
    server.on('error', reject)
  })
}

function getLLMFitPath(): string {
  const isDev = !app.isPackaged
  if (isDev) {
    return process.env.LLMFIT_PATH || 'llmfit'
  }
  return path.join(process.resourcesPath, 'bin', 'llmfit')
}

function httpGet(port: number, requestPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port, path: requestPath, method: 'GET' },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => resolve(data))
      }
    )
    req.on('error', reject)
    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('LLMFit request timed out'))
    })
    req.end()
  })
}

async function waitForServer(port: number, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await httpGet(port, '/health')
      return
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw new Error('LLMFit server did not start in time')
}

export async function startLLMFit(): Promise<number> {
  if (llmfitProcess && currentPort) return currentPort

  const port = await findAvailablePort()
  const llmfitPath = getLLMFitPath()

  llmfitProcess = spawn(llmfitPath, ['serve', '--port', String(port)], {
    stdio: 'ignore',
  })

  llmfitProcess.on('exit', () => {
    llmfitProcess = null
    currentPort = null
  })

  await waitForServer(port)
  currentPort = port
  return port
}

export function stopLLMFit(): void {
  if (llmfitProcess) {
    llmfitProcess.kill()
    llmfitProcess = null
    currentPort = null
  }
}

export async function scanHardware(): Promise<unknown> {
  const port = await startLLMFit()
  try {
    const response = await httpGet(port, '/api/system')
    return JSON.parse(response)
  } finally {
    stopLLMFit()
  }
}

export async function recommendModels(): Promise<unknown> {
  const port = await startLLMFit()
  try {
    const response = await httpGet(port, '/api/fit')
    return JSON.parse(response)
  } finally {
    stopLLMFit()
  }
}
