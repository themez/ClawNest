import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { DEFAULT_GATEWAY_PORT } from '@shared/constants'
import type { EnvironmentInfo } from '@shared/openclaw-types'

function runQuick(
  cmd: string,
  args: string[],
  timeoutMs = 10_000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'pipe',
      timeout: timeoutMs,
      shell: process.platform === 'win32',
    })
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString()
    })

    child.on('error', () => {
      resolve({ stdout, stderr, exitCode: 1 })
    })
    child.on('close', (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 1 })
    })
  })
}

export async function detectNodeJs(): Promise<{
  installed: boolean
  version?: string
  path?: string
}> {
  const versionResult = await runQuick('node', ['--version'])
  if (versionResult.exitCode !== 0) {
    return { installed: false }
  }

  const whichCmd = process.platform === 'win32' ? 'where' : 'which'
  const pathResult = await runQuick(whichCmd, ['node'])

  return {
    installed: true,
    version: versionResult.stdout.replace(/^v/, ''),
    path: pathResult.exitCode === 0 ? pathResult.stdout.split('\n')[0] : undefined,
  }
}

export async function detectOpenClaw(): Promise<{
  installed: boolean
  version?: string
  path?: string
}> {
  const result = await runQuick('openclaw', ['--version'])
  if (result.exitCode !== 0) {
    return { installed: false }
  }

  // openclaw --version outputs something like "openclaw/1.2.3" or "1.2.3"
  const version = result.stdout.replace(/^openclaw\/?/i, '').trim()

  const whichCmd = process.platform === 'win32' ? 'where' : 'which'
  const pathResult = await runQuick(whichCmd, ['openclaw'])

  return {
    installed: true,
    version,
    path: pathResult.exitCode === 0 ? pathResult.stdout.split('\n')[0] : undefined,
  }
}

function probePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' }, () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
    socket.setTimeout(2000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

export async function detectGateway(): Promise<{
  running: boolean
  port?: number
}> {
  // Try CLI status first
  const result = await runQuick('openclaw', ['gateway', 'status', '--json'])
  if (result.exitCode === 0) {
    try {
      const status = JSON.parse(result.stdout)
      if (status.gateway?.running) {
        return { running: true, port: status.gateway.port }
      }
    } catch {
      // fall through to probe
    }
  }

  // Fallback: TCP probe (catches child-process-spawned gateways)
  const port = DEFAULT_GATEWAY_PORT
  if (await probePort(port)) {
    return { running: true, port }
  }

  return { running: false }
}

export async function detectDaemon(): Promise<{
  installed: boolean
  type?: string | null
}> {
  if (process.platform === 'darwin') {
    const result = await runQuick('launchctl', ['list'])
    if (result.exitCode === 0 && result.stdout.includes('openclaw')) {
      return { installed: true, type: 'launchd' }
    }
  } else if (process.platform === 'win32') {
    const result = await runQuick('schtasks', ['/query', '/tn', 'openclaw'])
    if (result.exitCode === 0) {
      return { installed: true, type: 'schtasks' }
    }
  }
  return { installed: false, type: null }
}

export async function detectAll(): Promise<EnvironmentInfo> {
  const [node, openclaw, gateway, daemon] = await Promise.all([
    detectNodeJs(),
    detectOpenClaw(),
    detectGateway(),
    detectDaemon(),
  ])

  return {
    nodeInstalled: node.installed,
    nodeVersion: node.version,
    nodePath: node.path,
    openclawInstalled: openclaw.installed,
    openclawVersion: openclaw.version,
    openclawPath: openclaw.path,
    gatewayRunning: gateway.running,
    gatewayPort: gateway.port,
    daemonInstalled: daemon.installed,
    daemonType: daemon.type,
  }
}
