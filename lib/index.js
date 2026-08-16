// reveal-file — Host half (persistent plugin).
// Registers a REST endpoint `/api/reveal-file/reveal` through the host `webServer`
// service; the browser client half calls it with fetch(). This is the correct
// pattern for a STATIC host plugin (not the dynamic-runner sandbox, which has no
// `harness` global). On Windows uses explorer.exe /select, with macOS (open -R)
// and Linux (xdg-open) fallbacks.
export const name = 'reveal-file'
export const inject = ['fs', 'subprocess', 'webServer']

export function apply(ctx) {
  const fs = ctx.get('fs')
  const subprocess = ctx.get('subprocess')
  const webServer = ctx.get('webServer')

  if (!fs || !subprocess || !webServer) return

  function dirnameOf(path) {
    const at = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
    return at <= 0 ? path : path.slice(0, at)
  }

  function errorMessage(error) {
    return error instanceof Error ? error.message : String(error)
  }

  async function pickRevealCommand(processPath) {
    const candidates = [
      ['explorer.exe', ['/select,', processPath]],
      ['open', ['-R', processPath]],
      ['xdg-open', [dirnameOf(processPath)]]
    ]
    let lastError = null
    for (const [cmd, _args] of candidates) {
      try {
        await subprocess.resolveExecutable(cmd)
        const cmdInfo = candidates.find(c => c[0] === cmd)
        return cmdInfo
      } catch (error) {
        lastError = error
      }
    }
    throw lastError !== null ? lastError : new Error('no reveal command is available on this platform')
  }

  async function handleReveal(path) {
    if (fs === undefined || subprocess === undefined) {
      return { ok: false, error: 'filesystem or subprocess service is unavailable' }
    }
    if (!path) return { ok: false, error: 'a file path is required' }
    let target
    try {
      target = await fs.resolve(path)
    } catch (error) {
      return { ok: false, error: 'path resolve failed: ' + errorMessage(error) }
    }
    const processPath = fs.processPath(target)
    try {
      const info = await fs.stat(target)
      if (info === undefined) return { ok: false, error: 'the file does not exist' }
    } catch (error) {
      return { ok: false, error: 'stat failed: ' + errorMessage(error) }
    }
    let command
    try {
      command = await pickRevealCommand(processPath)
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
    try {
      const handle = subprocess.spawn({
        argv: [command[0], ...command[1]],
        cwd: dirnameOf(processPath),
        stdio: { stdin: 'ignore', stdout: { maxBytes: 1024 }, stderr: { maxBytes: 1024 } },
        graceMs: 5000
      })
      handle.done.catch(() => {})
    } catch (error) {
      return { ok: false, error: 'spawn failed: ' + errorMessage(error) }
    }
    return { ok: true, path: processPath }
  }

  function readBody(req) {
    return new Promise((resolve) => {
      let data = ''
      req.on('data', (chunk) => {
        data += chunk
        if (data.length > 65536) req.destroy()
      })
      req.on('end', () => resolve(data))
      req.on('error', () => resolve(''))
    })
  }

  function sendJson(res, status, obj) {
    const body = JSON.stringify(obj)
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
    res.end(body)
  }

  const disposer = webServer.register({
    kind: 'exact',
    path: '/api/reveal-file/reveal',
    handler: async (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'POST only' }); return }
      const raw = await readBody(req)
      let args
      try { args = JSON.parse(raw || '{}') } catch (e) { sendJson(res, 400, { ok: false, error: 'bad json' }); return }
      const path = args && typeof args.path === 'string' ? args.path : ''
      const result = await handleReveal(path)
      sendJson(res, result.ok ? 200 : 500, result)
    },
  })
  ctx.effect(() => disposer)
}
