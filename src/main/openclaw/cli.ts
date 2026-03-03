import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class OpenClawNotInstalledError extends Error {
  constructor() {
    super('OpenClaw is not installed')
    this.name = 'OpenClawNotInstalledError'
  }
}

export class OpenClawCommandError extends Error {
  exitCode: number
  stderr: string

  constructor(exitCode: number, stderr: string) {
    super(`OpenClaw command failed (exit ${exitCode}): ${stderr}`)
    this.name = 'OpenClawCommandError'
    this.exitCode = exitCode
    this.stderr = stderr
  }
}

export class OpenClawTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`OpenClaw command timed out after ${timeoutMs}ms`)
    this.name = 'OpenClawTimeoutError'
  }
}

// ---------------------------------------------------------------------------
// StreamHandle — for streaming command output
// ---------------------------------------------------------------------------

export class StreamHandle extends EventEmitter {
  private child: ChildProcess

  constructor(child: ChildProcess) {
    super()
    this.child = child

    child.stdout?.on('data', (data: Buffer) => {
      this.emit('data', data.toString())
    })
    child.stderr?.on('data', (data: Buffer) => {
      this.emit('data', data.toString())
    })
    child.on('error', (err) => {
      this.emit('error', err)
      this.emit('exit', 1)
    })
    child.on('close', (code) => {
      this.emit('exit', code ?? 1)
    })
  }

  kill() {
    this.child.kill()
  }
}

// ---------------------------------------------------------------------------
// OpenClawCli
// ---------------------------------------------------------------------------

export class OpenClawCli {
  /**
   * Execute an OpenClaw CLI command and collect output.
   */
  async exec(
    args: string[],
    timeoutMs = 30_000,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn('openclaw', args, {
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

      child.on('error', (err) => {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          reject(new OpenClawNotInstalledError())
        } else if (err.message.includes('timeout')) {
          reject(new OpenClawTimeoutError(timeoutMs))
        } else {
          reject(err)
        }
      })

      child.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 1,
        })
      })
    })
  }

  /**
   * Start a streaming command (e.g., install). Returns a StreamHandle
   * that emits 'data' and 'exit' events.
   */
  stream(args: string[]): StreamHandle {
    const child = spawn('openclaw', args, {
      stdio: 'pipe',
      shell: process.platform === 'win32',
    })
    return new StreamHandle(child)
  }

  async isInstalled(): Promise<boolean> {
    try {
      const result = await this.exec(['--version'], 5_000)
      return result.exitCode === 0
    } catch {
      return false
    }
  }

  async getVersion(): Promise<string | null> {
    try {
      const result = await this.exec(['--version'], 5_000)
      if (result.exitCode !== 0) return null
      return result.stdout.replace(/^openclaw\/?/i, '').trim()
    } catch {
      return null
    }
  }

  async getStatus(): Promise<unknown> {
    const result = await this.exec(['gateway', 'status', '--json'])
    return JSON.parse(result.stdout)
  }
}

export const openclawCli = new OpenClawCli()
