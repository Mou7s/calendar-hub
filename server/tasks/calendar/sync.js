import { defineTask } from 'nitropack/runtime'
import { syncCalendars } from '../../utils/calendar-sync.js'

export default defineTask({
  meta: {
    name: 'calendar:sync',
    description: 'Refresh SpaceX and F1 calendars in Cloudflare KV'
  },
  async run({ context }) {
    const env = context.cloudflare?.env || {}
    const result = await syncCalendars(env)
    return { result }
  }
})
