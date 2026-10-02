import { defineNitroPlugin } from 'nitropack/runtime'
import { getResponseStatus, setResponseStatus } from 'h3'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:before', ({ event }) => {
    // Node otherwise fills the default reason phrase when sending the stream,
    // after Nuxt has taken its late-mutation snapshot.
    if (getResponseStatus(event) === 200 && !event.node.res.statusMessage) {
      setResponseStatus(event, 200, 'OK')
    }
  })
})
