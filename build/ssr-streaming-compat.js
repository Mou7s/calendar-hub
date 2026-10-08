// Temporary compatibility adapters for Nuxt 4.6. Transform build inputs,
// never installed dependencies, and keep late-mutation diagnostics enabled.
import MagicString from 'magic-string'

function mapped(code, result, id) {
  const source = new MagicString(code)
  source.overwrite(0, code.length, result)
  return { code: source.toString(), map: source.generateMap({ source: id, includeContent: true, hires: true }).toString() }
}
export function streamingServerCompat() {
  return {
    name: 'calendar-streaming-server-compat',
    transform(code, id) {
      const path = id.replaceAll('\\', '/')
      if (path.endsWith('/@nuxt/nitro-server/dist/runtime/plugins/dev-server-logs.mjs')) {
        const start = code.indexOf('\tnitroApp.hooks.hook("render:html", (htmlContext) => {')
        const end = code.indexOf('\n\t});\n};', start)
        if (start < 0 || end < 0) throw new Error('Re-evaluate Nuxt streaming log adapter after upgrade')
        const callback = code.slice(start, end).replace('\tnitroApp.hooks.hook("render:html", (htmlContext) => {', '\tconst appendLogs = (htmlContext) => {')
        return mapped(code, code.slice(0, start) + callback + '\n\t};\n\tnitroApp.hooks.hook("render:html", (html, context) => { if (!context.streaming) appendLogs(html) });\n\tnitroApp.hooks.hook("render:html:close", appendLogs);' + code.slice(end + '\n\t});'.length), id)
      }
      if (path.endsWith('/@nuxt/nitro-server/dist/runtime/handlers/renderer.mjs')) {
        // Nuxt 4.6 delegates rendering to nuxt/internal/renderer.
        if (code.includes('createNuxtRenderer(rendererInstance)') && code.includes('renderer.fetch(toRequestEvent(event))')) return
        // Nuxt sets these headers itself after taking the diagnostic snapshot.
        // Set them before the snapshot instead, so real late writes remain visible.
        const headers = '\tsetResponseHeader(event, "content-type", "text/html;charset=utf-8");\n\tsetResponseHeader(event, "x-powered-by", "Nuxt");'
        const marker = '\tconst committedSnapshot = import.meta.dev ? {'
        if (!code.includes(marker) || !code.includes(headers)) throw new Error('Re-evaluate Nuxt streaming header adapter after upgrade')
        return mapped(code, code.replace(headers + '\n\treturn { body: outputStream };', '\treturn { body: outputStream };').replace(marker, headers + '\n' + marker), id)
      }
      if (path.endsWith('/nuxt/dist/runtime/server/renderer/index.js')) {
        const headers = '\tevent.res.headers.set("content-type", "text/html;charset=utf-8");\n\tevent.res.headers.set("x-powered-by", "Nuxt");'
        const marker = '\tconst committedSnapshot = import.meta.dev ? {'
        const tail = headers + '\n\treturn { body: outputStream };'
        if (!code.includes(marker) || !code.includes(tail)) throw new Error('Re-evaluate Nuxt streaming header adapter after upgrade')
        return mapped(code, code.replace(tail, '\treturn { body: outputStream };').replace(marker, headers + '\n' + marker), id)
      }
    }
  }
}

/** @returns {import('vite').Plugin} */
export function streamingCookieCompat() {
  return {
    name: 'calendar-streaming-cookie-compat',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/nuxt/dist/app/composables/cookie.js')) return
      const marker = 'const unhook = nuxtApp.hooks.hookOnce("app:rendered", writeFinalCookieValue);'
      if (!code.includes(marker)) throw new Error('Re-evaluate Nuxt streaming cookie adapter after upgrade')
      // Cookies established during plugin setup (including locale detection)
      // must be sent before rendering. The final hook still detects later writes.
      return mapped(code, code.replace(marker, 'nuxtApp.hooks.hookOnce("app:created", writeFinalCookieValue);\n\t\t' + marker), id)
    }
  }
}
