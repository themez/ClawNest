#!/usr/bin/env node

/**
 * Test script for OpenClaw install/uninstall flow.
 * Simulates what the Electron main process does — spawns npm and streams output.
 *
 * Usage:
 *   node scripts/test-install.mjs           # install then uninstall
 *   node scripts/test-install.mjs install    # install only
 *   node scripts/test-install.mjs uninstall  # uninstall only
 */

import { spawn } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const PKG = 'openclaw'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts() {
  return new Date().toISOString().slice(11, 23)
}

function log(tag, msg) {
  console.log(`[${ts()}] [${tag}] ${msg}`)
}

function runNpm(args, label) {
  return new Promise((resolve) => {
    const cmd = `${npm} ${args.join(' ')}`
    log(label, `$ ${cmd}`)
    log(label, '--- start ---')

    const start = Date.now()
    const child = spawn(npm, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d) => {
      const text = d.toString()
      stdout += text
      // Print each line with elapsed time
      for (const line of text.split('\n').filter(Boolean)) {
        log(label, `[stdout +${((Date.now() - start) / 1000).toFixed(1)}s] ${line}`)
      }
    })

    child.stderr.on('data', (d) => {
      const text = d.toString()
      stderr += text
      for (const line of text.split('\n').filter(Boolean)) {
        log(label, `[stderr +${((Date.now() - start) / 1000).toFixed(1)}s] ${line}`)
      }
    })

    child.on('error', (err) => {
      log(label, `ERROR: ${err.message}`)
      resolve({ ok: false, exitCode: 1, stdout, stderr, elapsed: Date.now() - start })
    })

    child.on('close', (code) => {
      const elapsed = Date.now() - start
      log(label, `--- exit ${code} (${(elapsed / 1000).toFixed(1)}s) ---\n`)
      resolve({ ok: code === 0, exitCode: code, stdout, stderr, elapsed })
    })
  })
}

function checkInstalled() {
  return new Promise((resolve) => {
    const child = spawn(PKG, ['--version'], { stdio: 'pipe', timeout: 5000 })
    let out = ''
    child.stdout?.on('data', (d) => { out += d.toString() })
    child.on('error', () => resolve(null))
    child.on('close', (code) => resolve(code === 0 ? out.trim() : null))
  })
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function install() {
  log('PRE', `Checking if ${PKG} is already installed...`)
  const ver = await checkInstalled()
  if (ver) {
    log('PRE', `${PKG} already installed: ${ver}`)
  } else {
    log('PRE', `${PKG} not found`)
  }

  const result = await runNpm(['install', '-g', PKG], 'INSTALL')
  if (result.ok) {
    const newVer = await checkInstalled()
    log('POST', `Installed successfully: ${newVer ?? 'unknown version'}`)
  } else {
    log('POST', `Install failed (exit ${result.exitCode})`)
  }
  return result
}

async function uninstall() {
  log('PRE', `Checking if ${PKG} is installed...`)
  const ver = await checkInstalled()
  if (!ver) {
    log('PRE', `${PKG} is not installed, nothing to uninstall`)
    return { ok: true, exitCode: 0, stdout: '', stderr: '', elapsed: 0 }
  }
  log('PRE', `Found ${PKG}: ${ver}`)

  const result = await runNpm(['uninstall', '-g', PKG], 'UNINSTALL')
  if (result.ok) {
    const stillThere = await checkInstalled()
    log('POST', stillThere ? `WARNING: still found: ${stillThere}` : 'Uninstalled successfully')
  } else {
    log('POST', `Uninstall failed (exit ${result.exitCode})`)
  }
  return result
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const action = process.argv[2] || 'all'

  console.log(`\n=== OpenClaw Install Test (action: ${action}) ===\n`)

  if (action === 'install' || action === 'all') {
    await install()
  }

  if (action === 'uninstall' || action === 'all') {
    await uninstall()
  }

  console.log('\n=== Done ===\n')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
