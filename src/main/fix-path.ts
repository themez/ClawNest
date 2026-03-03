import { execSync } from 'node:child_process'

/**
 * GUI apps may get a minimal PATH. This function sources
 * the user's login shell (macOS/Linux) or checks common
 * Node.js install locations (Windows) to get the full PATH.
 */
export function fixPath(): void {
  if (process.platform === 'win32') {
    fixPathWindows()
    return
  }

  try {
    const shell = process.env.SHELL || '/bin/zsh'
    const result = execSync(`${shell} -ilc 'echo -n "$PATH"'`, {
      encoding: 'utf8',
      timeout: 5000,
    })
    if (result) {
      process.env.PATH = result
    }
  } catch {
    // Fallback: prepend common binary paths
    const extra = [
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      '/usr/local/bin',
      `${process.env.HOME}/.nvm/current/bin`,
      `${process.env.HOME}/.fnm/current/bin`,
      `${process.env.HOME}/.volta/bin`,
    ]
    process.env.PATH = extra.join(':') + ':' + (process.env.PATH || '')
  }
}

function fixPathWindows(): void {
  const extra = [
    // Default Node.js installer location
    `${process.env.ProgramFiles}\\nodejs`,
    // npm global bin (prefix)
    `${process.env.APPDATA}\\npm`,
    // fnm / nvm-windows / volta
    `${process.env.LOCALAPPDATA}\\fnm_multishells`,
    `${process.env.NVM_HOME}`,
    `${process.env.LOCALAPPDATA}\\volta\\bin`,
    `${process.env.USERPROFILE}\\.volta\\bin`,
  ].filter(Boolean) as string[]

  const currentPath = process.env.PATH || ''
  const missing = extra.filter((p) => !currentPath.toLowerCase().includes(p.toLowerCase()))
  if (missing.length > 0) {
    process.env.PATH = missing.join(';') + ';' + currentPath
  }
}
