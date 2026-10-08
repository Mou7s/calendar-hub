import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { streamingServerCompat, streamingCookieCompat } from '../build/ssr-streaming-compat.js'

test('streaming logs preserve both buffered and streamed delivery', () => {
  const path = 'node_modules/@nuxt/nitro-server/dist/runtime/plugins/dev-server-logs.mjs'
  const result = streamingServerCompat().transform(readFileSync(path, 'utf8'), path)
  const callbacks = {}
  const start = result.code.indexOf('const appendLogs =')
  const end = result.code.indexOf('\n};', start)
  const ctx = { logs: ['SSR log'], event: { context: {} } }
  new Function('nitroApp', 'asyncContext', 'devReducers', 'appId', 'stringify', 'serverDiagnostics', result.code.slice(start, end))(
    { hooks: { hook: (name, fn) => { callbacks[name] = fn } } },
    { tryUse: () => ctx }, {}, 'nuxt-app', JSON.stringify, {}
  )
  const shell = { bodyAppend: [] }
  callbacks['render:html'](shell, { streaming: true })
  assert.deepEqual(shell.bodyAppend, [])
  callbacks['render:html:close'](shell)
  assert.match(shell.bodyAppend[0], /SSR log/)
  const buffered = { bodyAppend: [] }
  callbacks['render:html'](buffered, {})
  assert.match(buffered.bodyAppend[0], /data-nuxt-logs/)
})

test('streaming snapshot includes framework headers without disabling mutation checks', () => {
  const path = 'node_modules/nuxt/dist/runtime/server/renderer/index.js'
  const result = streamingServerCompat().transform(readFileSync(path, 'utf8'), path)
  const snapshot = result.code.indexOf('const committedSnapshot')
  assert.ok(result.code.lastIndexOf('event.res.headers.set("x-powered-by", "Nuxt")', snapshot) >= 0)
  assert.match(result.code, /rendererDiagnostics.NUXT_E8002/)
  assert.match(result.code, /currentHeaders !== committedSnapshot.headers/)
  assert.equal(result.code.match(/event.res.headers.set\("x-powered-by", "Nuxt"\)/g).length, 1)
})

test('Nitro renderer delegates to the adapted Nuxt renderer', () => {
  const path = 'node_modules/@nuxt/nitro-server/dist/runtime/handlers/renderer.mjs'
  assert.equal(streamingServerCompat().transform(readFileSync(path, 'utf8'), path), undefined)
  assert.throws(() => streamingServerCompat().transform('unknown renderer', path), /Re-evaluate/)
})

test('plugin cookies flush before rendering and retain final mutation checks', () => {
  const path = 'node_modules/nuxt/dist/app/composables/cookie.js'
  const result = streamingCookieCompat().transform(readFileSync(path, 'utf8'), path)
  assert.match(result.code, /hookOnce\("app:created", writeFinalCookieValue\)/)
  assert.match(result.code, /hookOnce\("app:rendered", writeFinalCookieValue\)/)
})
