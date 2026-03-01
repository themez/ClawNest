import { spawn } from 'node:child_process'
import type { EnvironmentInfo } from '@shared/openclaw-types'

function runQuick(
  cmd: string,
  args: string[],
  timeoutMs = 10_000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'pipe', timeout: timeoutMs })
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
}> {
  const result = await runQuick('openclaw', ['--version'])
  if (result.exitCode !== 0) {
    return { installed: false }
  }

  // openclaw --version outputs something like "openclaw/1.2.3" or "1.2.3"
  const version = result.stdout.replace(/^openclaw\/?/i, '').trim()
  return { installed: true, version }
}

export async function detectGateway(): Promise<{
  running: boolean
  port?: number
}> {
  const result = await runQuick('openclaw', ['gateway', 'status', '--json'])
  if (result.exitCode !== 0) {
    return { running: false }
  }

  try {
    const status = JSON.parse(result.stdout)
    return {
      running: status.gateway?.running ?? false,
      port: status.gateway?.port,
    }
  } catch {
    return { running: false }
  }
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
    gatewayRunning: gateway.running,
    gatewayPort: gateway.port,
    daemonInstalled: daemon.installed,
    daemonType: daemon.type,
  }
}
