import { defineTask } from 'nitropack/runtime'
import { runCalendarSyncTask } from '../../utils/calendar-sync.js'

export default defineTask({
  meta: {
    name: 'calendar:sync',
    description: 'Refresh SpaceX and F1 calendars in Cloudflare KV'
  },
  async run({ context }) {
    return { result: await runCalendarSyncTask(context) }
  }
})
