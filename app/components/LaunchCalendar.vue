<template>
  <div class="h-full w-full flex min-h-0 overflow-hidden bg-[#121212] text-[#ffffff] font-sans select-none">
    
    <!-- 1. Left Sidebar (纯粹 iCloud 黑白灰侧边栏 - 移除左侧卡片) -->
    <aside
      class="w-60 flex-shrink-0 bg-[#171717] border-r border-[#262626] flex flex-col justify-between p-4 min-h-0 overflow-y-auto hidden md:flex"
    >
      <div class="space-y-6">
        <!-- Top App Title -->
        <div class="flex items-center justify-between">
          <div class="flex items-baseline gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black shadow-md shadow-white/10">
              <UIcon name="i-heroicons-calendar" class="w-4.5 h-4.5" />
            </div>
            <span class="text-lg font-extrabold tracking-wider text-white font-mono">CALENDAR</span>
            <span class="text-[8px] tracking-[0.2em] text-[#737373] font-bold">HUB</span>
          </div>
        </div>

        <!-- Calendars Layer Checklist Section -->
        <div class="space-y-2 pt-2 border-t border-[#262626]">
          <label class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373] px-1 block">
            {{ t('calendar.sidebar.calendars') }}
          </label>

          <div class="space-y-1.5">
            <div
              v-for="layer in calendarLayers"
              :key="layer.id"
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-[#262626] transition-colors group"
            >
              <button
                type="button"
                class="flex-1 flex items-center gap-2.5 cursor-pointer text-left min-w-0"
                :aria-pressed="isCalendarActive(layer.id)"
                @click="toggleCalendarLayer(layer.id)"
              >
                <div
                  class="w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all duration-200 shrink-0"
                  :class="isCalendarActive(layer.id) ? 'text-black shadow-sm shadow-white/20' : 'border border-[#404040] text-transparent hover:border-[#737373]'"
                  :style="isCalendarActive(layer.id) ? { backgroundColor: layer.color } : undefined"
                >
                  <UIcon name="i-heroicons-check-16-solid" class="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span
                  class="text-xs font-semibold tracking-wide transition-colors truncate"
                  :class="isCalendarActive(layer.id) ? 'text-white font-bold' : 'text-[#737373] line-through'"
                >
                  {{ layer.name }}
                </span>
              </button>

              <a
                :href="getWebcalUrl(layer.id)"
                class="px-2 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-all shadow-md shadow-blue-600/30 hover:scale-105 active:scale-95 shrink-0 cursor-pointer ml-2 no-underline"
                :title="t('subscribe.subscribeLink')"
                @click.stop
              >
                <UIcon name="i-heroicons-rss-16-solid" class="w-3.5 h-3.5" />
                <span>{{ t('subscribe.buttonShort') || 'Subscribe' }}</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Language Select in Sidebar -->
        <div class="space-y-2 pt-2 border-t border-[#262626]">
          <label class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373] px-1 block">
            {{ t('calendar.sidebar.language') }}
          </label>
          <USelectMenu
            v-model="activeLocaleCode"
            :items="languageOptions"
            value-key="value"
            label-key="label"
            icon="i-heroicons-language"
            size="sm"
            color="neutral"
            variant="subtle"
            class="w-full"
            aria-label="Select Language"
          />
        </div>
      </div>
    </aside>

    <!-- 2. Right Main Calendar Area (主界面) -->
    <main class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#181818]">
      
      <!-- Top Header Toolbar (黑白灰极简工具栏) -->
      <header class="h-auto min-h-14 border-b border-[#262626] px-3 py-2 grid grid-cols-[1fr_auto] gap-x-2 gap-y-2 shrink-0 bg-[#141414] sm:h-14 sm:px-4 sm:py-0 sm:flex sm:items-center sm:justify-between">
        <!-- Left: Month Title + Lunar Year -->
        <div class="flex items-center gap-3">
          <h1 class="text-lg sm:text-2xl font-extrabold text-white tracking-tight flex items-baseline gap-2 font-mono !mb-0 !leading-normal !max-w-none truncate">
            <span>{{ monthTitleEnglish }}</span>
            <span v-if="showLunarCalendarLabels" class="text-xs font-medium text-[#737373] hidden sm:inline">{{ lunarYearLabel }}</span>
          </h1>
        </div>

        <!-- Center: Day / Week / Month Switcher (Apple Style Segmented Slider) -->
        <div class="relative hidden sm:flex items-center bg-[#262626] p-0.5 rounded-lg text-xs font-semibold select-none border border-[#333333]">
          <!-- Active Sliding Background -->
          <div
            class="absolute top-0.5 bottom-0.5 w-[calc(33.333%-2px)] bg-[#404040] rounded-md shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            :style="{
              left: activeCalendarView === 'day' ? '2px' : activeCalendarView === 'week' ? 'calc(33.333% + 1px)' : 'calc(66.666% + 0px)'
            }"
          ></div>

          <button
            type="button"
            class="relative z-10 px-3.5 py-1 rounded-md transition-colors cursor-pointer"
            :class="activeCalendarView === 'day' ? 'text-white font-bold' : 'text-[#737373] hover:text-white'"
            @click="activeCalendarView = 'day'"
          >
            {{ t('calendar.viewDay') }}
          </button>

          <button
            type="button"
            class="relative z-10 px-3.5 py-1 rounded-md transition-colors cursor-pointer"
            :class="activeCalendarView === 'week' ? 'text-white font-bold' : 'text-[#737373] hover:text-white'"
            @click="activeCalendarView = 'week'"
          >
            {{ t('calendar.viewWeek') }}
          </button>

          <button
            type="button"
            class="relative z-10 px-3.5 py-1 rounded-md transition-colors cursor-pointer"
            :class="activeCalendarView === 'month' ? 'text-white font-bold' : 'text-[#737373] hover:text-white'"
            @click="activeCalendarView = 'month'"
          >
            {{ t('calendar.viewMonth') }}
          </button>
        </div>

        <!-- Right: Controls < Today > -->
        <div class="flex items-center gap-2">
          <div class="flex items-center text-white text-sm font-semibold gap-1">
            <button
              type="button"
              class="p-1 hover:bg-[#262626] rounded-lg transition-colors text-[#a3a3a3] hover:text-white"
              :disabled="activeCalendarView === 'month' && activeMonthIndex <= 0"
              @click="navigateCalendar(-1)"
            >
              <UIcon name="i-heroicons-chevron-left" class="w-5 h-5" />
            </button>
            
            <button
              type="button"
              class="px-2.5 py-1 hover:bg-[#262626] rounded-lg transition-colors font-bold text-white"
              @click="jumpToToday"
            >
              {{ t('calendar.today') }}
            </button>

            <button
              type="button"
              class="p-1 hover:bg-[#262626] rounded-lg transition-colors text-[#a3a3a3] hover:text-white"
              :disabled="activeCalendarView === 'month' && activeMonthIndex >= monthKeys.length - 1"
              @click="navigateCalendar(1)"
            >
              <UIcon name="i-heroicons-chevron-right" class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Mobile View Switcher -->
        <div class="col-span-2 flex sm:hidden items-center bg-[#262626] p-0.5 rounded-lg text-[11px] font-semibold select-none border border-[#333333]">
          <button
            type="button"
            class="flex-1 min-w-0 px-2 py-1 rounded-md transition-colors cursor-pointer"
            :class="activeCalendarView === 'day' ? 'bg-[#404040] text-white font-bold' : 'text-[#737373] hover:text-white'"
            @click="activeCalendarView = 'day'"
          >
            {{ t('calendar.viewDay') }}
          </button>
          <button
            type="button"
            class="flex-1 min-w-0 px-2 py-1 rounded-md transition-colors cursor-pointer"
            :class="activeCalendarView === 'week' ? 'bg-[#404040] text-white font-bold' : 'text-[#737373] hover:text-white'"
            @click="activeCalendarView = 'week'"
          >
            {{ t('calendar.viewWeek') }}
          </button>
          <button
            type="button"
            class="flex-1 min-w-0 px-2 py-1 rounded-md transition-colors cursor-pointer"
            :class="activeCalendarView === 'month' ? 'bg-[#404040] text-white font-bold' : 'text-[#737373] hover:text-white'"
            @click="activeCalendarView = 'month'"
          >
            {{ t('calendar.viewMonth') }}
          </button>
        </div>

        <!-- Mobile Calendar Layers -->
        <div class="col-span-2 flex sm:hidden items-center gap-1.5 min-w-0">
          <button
            v-for="layer in calendarLayers"
            :key="`mobile-${layer.id}`"
            type="button"
            class="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer"
            :class="isCalendarActive(layer.id) ? 'bg-[#262626] border-[#525252] text-white' : 'bg-transparent border-[#2c2c2c] text-[#737373]'"
            :aria-pressed="isCalendarActive(layer.id)"
            @click="toggleCalendarLayer(layer.id)"
          >
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: layer.color }"></span>
            <span class="truncate">{{ layer.name }}</span>
          </button>
        </div>
      </header>

      <!-- Weekday Header Row (Month View Only) -->
      <div v-if="activeCalendarView === 'month'" class="grid grid-cols-7 border-b border-[#262626] bg-[#141414] shrink-0 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
        <div
          v-for="(dayName, idx) in weekdayHeaders"
          :key="idx"
          :class="idx >= 5 ? 'text-white font-extrabold' : 'text-[#737373]'"
        >
          {{ dayName }}
        </div>
      </div>

      <!-- Main Dynamic Calendar View Switcher with Smooth Animations -->
      <Transition name="view-fade" mode="out-in">
        <!-- 1. Month View (月视图：7 Cols x 6 Rows) -->
        <div v-if="activeCalendarView === 'month'" key="month-view" class="flex-1 grid grid-cols-7 grid-rows-6 min-h-0 overflow-hidden bg-[#262626] gap-[1px]">
          <div
            v-for="day in gridDays"
            :key="day.isoDate"
            class="calendar-cell h-full min-h-0 p-1 sm:p-1.5 flex flex-col justify-between overflow-hidden transition-colors"
            :class="{
              'bg-[#141414]/80 text-[#525252]': !day.isCurrentMonth,
              'bg-[#1b1b1b] text-[#ffffff]': day.isCurrentMonth
            }"
          >
            <!-- Cell Header: Date Number + Lunar Term -->
            <div class="h-5 sm:h-6 flex items-center justify-between shrink-0 mb-0.5 sm:mb-1">
              <div class="flex items-center gap-0.5 sm:gap-1.5">
                <span
                  class="w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] sm:text-xs font-bold flex items-center justify-center transition-all shrink-0"
                  :class="{
                    'bg-white text-black font-black shadow-md shadow-white/20': day.isoDate === todayIso,
                    'text-white': day.isoDate !== todayIso && day.isCurrentMonth,
                    'text-[#525252]': !day.isCurrentMonth
                  }"
                >
                  {{ day.dayNumber }}
                </span>

                <span v-if="showLunarCalendarLabels" class="text-[10px] text-[#737373] font-normal truncate max-w-[60px] leading-none">
                  {{ getLunarText(day.isoDate) }}
                </span>
              </div>

              <span v-if="day.events.length > 0" class="text-[8px] sm:text-[9px] font-bold text-[#737373] leading-none">
                {{ day.events.length }}
              </span>
            </div>

            <!-- Events List inside Cell -->
            <div v-if="day.events.length > 0" class="flex-1 flex flex-col gap-0.5 sm:gap-1 min-h-0 overflow-y-auto scrollbar-none">
              <button
                v-for="event in day.events.slice(0, 3)"
                :key="event.id || event.slug"
                type="button"
                class="calendar-event w-full min-w-0 text-left px-1 sm:px-1.5 py-0.5 rounded-none text-[9px] sm:text-[10px] font-semibold transition-all flex items-center justify-start cursor-pointer shrink-0"
                :class="[
                  getEventStyleClass(event),
                  selectedMission && (selectedMission.id === event.id || selectedMission.slug === event.slug) ? 'border-b-2 border-b-white bg-[#303030] text-white font-bold' : ''
                ]"
                :aria-label="`${event.title} ${formatTimeShort(event.launchAt)}`"
                @click="handleEventClick(event, $event)"
              >
                <span
                  v-if="!event.isLive && !(event.scores && (event.provider === 'wtt' || event.calendarId === 'wtt'))"
                  class="calendar-event-dot w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0"
                  :style="{ backgroundColor: getProviderColor(event.provider) }"
                ></span>
                <span v-else-if="event.scores && (event.provider === 'wtt' || event.calendarId === 'wtt')" class="text-[8px] sm:text-[9px] leading-none shrink-0" title="Completed Match">🏆</span>
                <span v-else class="calendar-event-live inline-flex items-center gap-1 shrink-0">
                  <span class="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span>
                  <span class="text-[9px] font-extrabold text-white animate-pulse">● LIVE</span>
                </span>

                <span class="calendar-event-title min-w-0 truncate font-semibold flex-1">{{ event.title }}</span>
                <span class="calendar-event-compact min-w-0 flex-1 flex flex-col items-start leading-[1.1]">
                  <span class="w-full truncate text-[8px] font-bold">{{ getCompactEventTitle(event) }}</span>
                  <span class="w-full truncate text-[8px] opacity-60 font-mono">{{ formatTimeShort(event.launchAt) }}</span>
                </span>
                <span class="calendar-event-time text-[9px] opacity-60 shrink-0 font-mono">{{ formatTimeShort(event.launchAt) }}</span>
              </button>

              <button
                v-if="day.events.length > 3"
                type="button"
                class="text-[9px] font-bold text-white hover:underline px-1 text-left shrink-0"
                @click="handleEventClick(day.events[3], $event)"
              >
                {{ t('calendar.moreEvents', { count: day.events.length - 3 }) }}
              </button>
            </div>
          </div>
        </div>

        <!-- 2. Week View (周视图：24小时刻度线纵向等分网格) -->
        <div v-else-if="activeCalendarView === 'week'" key="week-view" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#181818]">
          <!-- Week Header Row (带左侧 56px 时间轴占位 + 7 列日期头) -->
          <div class="flex border-b border-[#262626] bg-[#141414] shrink-0 text-center py-2 text-xs font-bold uppercase tracking-wider select-none">
            <div class="w-14 shrink-0 border-r border-[#262626] flex items-center justify-center text-[10px] text-[#737373] font-mono">
              <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 opacity-60" />
            </div>
            <div class="flex-1 grid grid-cols-7 gap-px">
              <div
                v-for="(day, idx) in currentWeekDays"
                :key="day.isoDate"
                class="flex flex-col items-center justify-center py-1 gap-1"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] font-bold" :class="idx >= 5 ? 'text-white' : 'text-[#737373]'">
                    {{ weekdayHeaders[idx] }}
                  </span>
                  <span
                    class="w-5.5 h-5.5 rounded-full text-xs font-bold flex items-center justify-center transition-all shrink-0"
                    :class="day.isoDate === todayIso ? 'bg-white text-black font-black shadow-md shadow-white/20' : 'text-white'"
                  >
                    {{ day.dayNumber }}
                  </span>
                </div>
                <div v-if="showLunarCalendarLabels" class="text-[9px] text-[#737373] font-normal truncate max-w-[60px] leading-none">
                  {{ getLunarText(day.isoDate) }}
                </div>
              </div>
            </div>
          </div>

          <!-- 24-Hour Non-Scrollable Adaptive Body -->
          <div ref="timelineContainer" class="flex-1 flex min-h-0 bg-[#141414] relative overflow-hidden select-none">
            <!-- Left Adaptive 24-Hour Timeline Column -->
            <div class="w-14 shrink-0 bg-[#141414] border-r border-[#262626] select-none relative z-20 pointer-events-none h-full">
              <div
                v-for="hour in visibleHours"
                :key="hour"
                class="absolute right-0 pr-2 text-[10px] font-mono text-[#737373] -translate-y-1/2 flex items-center justify-end"
                :style="{ top: `${(hour / 24) * 100}%` }"
              >
                <span>{{ formatHourLabel(hour) }}</span>
              </div>

              <!-- Current Time Badge on Timeline Left -->
              <div
                v-if="isTodayInCurrentWeek"
                class="absolute right-1 z-30 -translate-y-1/2 px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500 text-white shadow-sm shadow-red-500/50"
                :style="{ top: `${currentTimeTopPct}%` }"
              >
                {{ currentTimeLabel }}
              </div>
            </div>

            <!-- Right 7-Day Adaptive Timeline Canvas -->
            <div class="flex-1 grid grid-cols-7 relative bg-[#181818] min-w-0 h-full">
              <!-- Background Hourly Lines (Highlighted on visible step hours) -->
              <div
                v-for="hour in hours24"
                :key="`line-${hour}`"
                class="absolute left-0 right-0 border-b pointer-events-none transition-colors"
                :class="hour % hourStep === 0 ? 'border-[#333333]/70' : 'border-[#262626]/30'"
                :style="{ top: `${(hour / 24) * 100}%` }"
              ></div>

              <!-- 7 Day Columns -->
              <div
                v-for="day in currentWeekDays"
                :key="`col-${day.isoDate}`"
                class="relative h-full border-r border-[#262626]/80 last:border-r-0"
              >
                <!-- Current Time Indicator Line for Today -->
                <div
                  v-if="day.isoDate === todayIso"
                  class="absolute left-0 right-0 z-30 pointer-events-none flex items-center -translate-y-1/2"
                  :style="{ top: `${currentTimeTopPct}%` }"
                >
                  <div class="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.25 shadow-md shadow-red-500/80 ring-2 ring-black"></div>
                  <div class="flex-1 h-[2px] bg-red-500 shadow-md shadow-red-500/50"></div>
                </div>

                <!-- Events positioned absolutely inside day column -->
                <template v-if="day.events?.length">
                  <button
                    v-for="event in day.events"
                    :key="event.id || event.slug"
                    type="button"
                    class="absolute z-20 min-w-0 text-left px-1.5 py-1 rounded-none text-xs transition-all flex flex-col justify-center gap-0.5 cursor-pointer border border-[#383838] hover:border-white hover:z-30 shadow-lg group overflow-hidden"
                    :class="[
                      getEventStyleClass(event),
                      selectedMission && (selectedMission.id === event.id || selectedMission.slug === event.slug) ? 'ring-2 ring-white z-30 font-bold' : ''
                    ]"
                    :style="getWeekEventStyle(event, day.events)"
                    @click="handleEventClick(event, $event)"
                  >
                    <div class="flex items-center gap-1 min-w-0 w-full shrink-0">
                      <span v-if="!event.isLive" class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: getProviderColor(event.provider) }"></span>
                      <span v-else class="text-[9px] font-extrabold text-white animate-pulse">● LIVE</span>
                      <span class="text-[10px] font-bold font-mono opacity-90 truncate leading-none">{{ formatTimeShort(event.launchAt) }}</span>
                    </div>

                    <span class="truncate font-black text-[11px] leading-snug group-hover:text-white w-full">
                      {{ event.title }}
                    </span>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Day View (日视图：按 24 小时刻度定位) -->
        <div v-else key="day-view" class="flex-1 flex flex-col min-h-0 overflow-hidden p-3 sm:p-6 bg-[#161616] gap-3 sm:gap-4">
          <div class="flex items-center justify-between border-b border-[#262626] pb-4 shrink-0">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-full bg-white text-black font-black flex items-center justify-center text-sm shadow-md shadow-white/20">
                {{ currentDayFocus?.dayNumber }}
              </span>
              <h2 class="text-xl font-bold text-white font-mono flex items-center gap-2">
                <span>{{ currentDayFocus?.isoDate }}</span>
                <span v-if="showLunarCalendarLabels" class="text-xs text-[#737373] font-normal">({{ getLunarText(currentDayFocus?.isoDate) }})</span>
              </h2>
            </div>
            <span class="text-xs font-mono text-[#737373]">
              {{ currentDayFocus?.events?.length || 0 }} {{ t('overview.launches') }}
            </span>
          </div>

          <!-- Empty Day State -->
          <div v-if="!currentDayFocus?.events?.length" class="flex-1 py-16 text-center text-[#737373] space-y-2">
            <UIcon name="i-heroicons-calendar-days" class="w-10 h-10 mx-auto opacity-40" />
            <p class="text-sm font-semibold">{{ t('calendar.noLaunches') }}</p>
          </div>

          <!-- Day Events Timeline -->
          <div v-else ref="timelineContainer" class="flex-1 flex min-h-0 bg-[#141414] relative overflow-hidden select-none">
            <div class="w-14 shrink-0 bg-[#141414] border-r border-[#262626] select-none relative z-20 pointer-events-none h-full">
              <div
                v-for="hour in visibleHours"
                :key="`day-hour-${hour}`"
                class="absolute right-0 pr-2 text-[10px] font-mono text-[#737373] -translate-y-1/2 flex items-center justify-end"
                :style="{ top: `${(hour / 24) * 100}%` }"
              >
                <span>{{ formatHourLabel(hour) }}</span>
              </div>
            </div>

            <div class="flex-1 relative bg-[#181818] min-w-0 h-full">
              <div
                v-for="hour in hours24"
                :key="`day-line-${hour}`"
                class="absolute left-0 right-0 border-b pointer-events-none"
                :class="hour % hourStep === 0 ? 'border-[#333333]/70' : 'border-[#262626]/30'"
                :style="{ top: `${(hour / 24) * 100}%` }"
              ></div>

              <div
                v-if="currentDayFocus.isoDate === todayIso"
                class="absolute left-0 right-0 z-30 pointer-events-none flex items-center -translate-y-1/2"
                :style="{ top: `${currentTimeTopPct}%` }"
              >
                <div class="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.25 shadow-md shadow-red-500/80 ring-2 ring-black"></div>
                <div class="flex-1 h-[2px] bg-red-500 shadow-md shadow-red-500/50"></div>
              </div>

              <button
                v-for="event in currentDayFocus.events"
                :key="event.id || event.slug"
                type="button"
                class="absolute z-20 min-w-0 text-left px-2 py-1 rounded-none text-xs transition-all flex flex-col justify-center gap-0.5 cursor-pointer border border-[#383838] hover:border-white hover:z-30 shadow-lg group overflow-hidden"
                :class="[
                  getEventStyleClass(event),
                  selectedMission && (selectedMission.id === event.id || selectedMission.slug === event.slug) ? 'ring-2 ring-white z-30 font-bold' : ''
                ]"
                :style="getWeekEventStyle(event, currentDayFocus.events)"
                @click="handleEventClick(event, $event)"
              >
                <div class="flex items-center gap-1 min-w-0 w-full shrink-0">
                  <span v-if="event.isLive" class="text-[9px] font-extrabold text-white animate-pulse">● LIVE</span>
                  <span v-else-if="event.scores" class="text-[10px] font-bold text-amber-400 font-mono shrink-0">🏆 {{ event.scores }}</span>
                  <span v-else class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: getProviderColor(event.provider) }"></span>
                  <span class="text-[10px] font-bold font-mono opacity-90 truncate leading-none">{{ formatTimeShort(event.launchAt) }}</span>
                </div>
                <span class="truncate font-black text-[11px] leading-snug group-hover:text-white w-full">{{ event.title }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </main>

    <!-- 3. Minimalist Event Detail Floating Card (极简气泡卡片 - 消除嵌套圆角框，专注内容) -->
    <div
      v-if="popoverEvent"
      class="fixed z-50 w-[calc(100vw-20px)] max-w-[300px] bg-[#161616] text-white border border-[#262626] rounded-xl shadow-2xl p-4 space-y-3 font-sans animate-fadeIn"
      :style="popoverStyle"
      @click.stop
    >
      <!-- Top Row: Provider Text & Close Button -->
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-mono font-bold tracking-widest text-[#a3a3a3] uppercase">
          {{ popoverEvent.providerName || popoverEvent.provider || 'SPACEX' }}
        </span>
        <button
          type="button"
          class="text-[#737373] hover:text-white p-1 rounded transition-colors"
          @click.stop="popoverEvent = null"
          aria-label="Close Floating Card"
        >
          <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
        </button>
      </div>

      <!-- Title, Scores & Live Badge -->
      <div>
        <div v-if="popoverEvent.isLive" class="flex items-center gap-1.5 text-[10px] font-bold text-[#ef4444] uppercase tracking-wider mb-1 font-mono">
          <span class="w-2 h-2 rounded-full bg-[#ef4444] animate-ping"></span>
          <span>{{ t('status.liveNow') }}</span>
        </div>
        <div v-else-if="popoverEvent.scores" class="flex items-center justify-between p-2 rounded-lg bg-[#202020] border border-[#333333] mb-2">
          <span class="text-amber-400 font-bold font-mono text-xs">🏆 {{ t('calendar.wtt.finalScore') || 'Final' }}: {{ popoverEvent.scores }}</span>
          <span v-if="popoverEvent.winner" class="text-[10px] text-neutral-300 font-semibold truncate max-w-[130px]">
            {{ t('calendar.wtt.winner') || 'Winner' }}: <strong class="text-white">{{ popoverEvent.winner }}</strong>
          </span>
        </div>
        <h3 class="text-base font-black text-white uppercase font-mono leading-snug">
          {{ popoverEvent.title }}
        </h3>
      </div>

      <!-- Direct Details Content (移除深色嵌套内盒) -->
      <div class="space-y-2 text-xs text-[#d4d4d4] pt-2 border-t border-[#262626]">
        <div class="flex items-center gap-2.5">
          <UIcon name="i-heroicons-clock" class="w-4 h-4 text-[#737373] shrink-0" />
          <span class="font-bold text-white font-mono">{{ formatFullDateTime(popoverEvent.launchAt) }}</span>
        </div>

        <div v-if="popoverEvent.vehicle" class="flex items-center gap-2.5">
          <UIcon :name="getCalendarEventPresentation(popoverEvent).vehicleIcon" class="w-4 h-4 text-[#737373] shrink-0" />
          <span class="truncate text-[#e5e5e5]">{{ t(getCalendarEventPresentation(popoverEvent).vehicleLabelKey) }}: <strong class="text-white">{{ popoverEvent.vehicle }}</strong></span>
        </div>

        <div v-if="popoverEvent.gameScores?.length" class="flex items-start gap-2.5">
          <UIcon name="i-heroicons-list-bullet" class="w-4 h-4 text-[#737373] shrink-0 mt-0.5" />
          <span class="leading-relaxed text-[#e5e5e5]">{{ t('calendar.wtt.games') || 'Games' }}: <strong class="text-white font-mono">{{ popoverEvent.gameScores.join(', ') }}</strong></span>
        </div>

        <div v-if="popoverEvent.launchSite" class="flex items-start gap-2.5">
          <UIcon :name="getCalendarEventPresentation(popoverEvent).locationIcon" class="w-4 h-4 text-[#737373] shrink-0 mt-0.5" />
          <span class="leading-relaxed text-[#e5e5e5]">{{ t(getCalendarEventPresentation(popoverEvent).locationLabelKey) }}: <strong class="text-white">{{ popoverEvent.launchSite }}</strong></span>
        </div>
      </div>

      <!-- Clean Action Button -->
      <div v-if="popoverEvent.missionUrl" class="pt-1">
        <NuxtLink
          :to="popoverEvent.missionUrl"
          target="_blank"
          class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-white bg-[#262626] hover:bg-[#333333] border border-[#333333] rounded-lg transition-colors"
        >
          <span>{{ t('mission.viewOfficialDetails') }}</span>
          <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3.5 h-3.5 text-[#a3a3a3]" />
        </NuxtLink>
      </div>
    </div>

    <!-- 订阅 Modal 弹窗 (暗黑极简苹果风) -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showSubscribeModal"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-text"
          @click.self="showSubscribeModal = false"
        >
          <div
            class="relative w-full max-w-md bg-[#1c1c1e] border border-[#2c2c2e] rounded-3xl p-6 shadow-2xl text-white space-y-5"
          >
            <!-- 头部说明与关闭按钮 -->
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="p-2 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                    <UIcon name="i-heroicons-rss-16-solid" class="w-5 h-5" />
                  </span>
                  <h3 class="text-base font-bold tracking-tight text-white">
                    {{ t('subscribe.title') }}
                  </h3>
                </div>
                <p class="text-xs text-[#a1a1aa] leading-relaxed pt-1">
                  {{ t('subscribe.copy') }}
                </p>
              </div>
              <button
                type="button"
                class="p-1.5 text-[#71717a] hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                @click="showSubscribeModal = false"
              >
                <UIcon name="i-heroicons-x-mark-20-solid" class="w-5 h-5" />
              </button>
            </div>

            <!-- 核心一键订阅按钮 -->
            <a
              :href="activeSubscribeWebcalUrl"
              class="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer no-underline"
            >
              <UIcon name="i-heroicons-calendar-days-20-solid" class="w-4 h-4" />
              <span>{{ t('subscribe.subscribeLink') }}</span>
            </a>

            <!-- 复制 ICS 链接 -->
            <div class="space-y-2 pt-3 border-t border-[#2c2c2e]">
              <label class="text-[10px] font-mono font-bold uppercase tracking-wider text-[#a1a1aa] block">
                {{ t('subscribe.eyebrow') }} (Google / Web)
              </label>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  readonly
                  :value="activeSubscribeIcsUrl"
                  class="flex-1 bg-[#121212] border border-[#2c2c2e] rounded-xl px-3 py-2 text-xs font-mono text-[#e4e4e7] focus:outline-none select-all"
                />
                <button
                  type="button"
                  class="px-3 py-2 text-xs font-bold rounded-xl bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                  @click="copyIcsUrl"
                >
                  <UIcon :name="isCopied ? 'i-heroicons-check-20-solid' : 'i-heroicons-clipboard-document-20-solid'" class="w-4 h-4 text-blue-400" />
                  <span>{{ isCopied ? t('subscribe.copied') : t('subscribe.copyBtn') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useLunar } from '~/composables/useLunar'
import { getCalendarEventPresentation } from '~/utils/calendar-event-presentation'
import {
  getCalendarNavigationStep,
  shiftCalendarDate,
  sortCalendarEventsByStartTime,
} from '~/utils/calendar-navigation'

const { getLunarText } = useLunar()
const { t, locale, locales, setLocale } = useI18n()

const showLunarCalendarLabels = computed(() => locale.value === 'zh-CN')
const displayLocale = computed(() => locale.value === 'zh' ? 'en-US' : (locale.value || 'en-US'))

const activeLocaleCode = computed({
  get: () => locale.value,
  set: (val) => {
    if (val && typeof setLocale === 'function') {
      setLocale(val)
    }
  }
})

const languageOptions = computed(() => {
  if (Array.isArray(locales?.value)) {
    return locales.value.map(l => {
      if (typeof l === 'string') return { value: l, label: l }
      return { value: l.code, label: l.name }
    })
  }
  return [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' }
  ]
})

const props = defineProps({
  gridDays: { type: Array, required: true },
  monthKeys: { type: Array, required: true },
  activeMonthIndex: { type: Number, required: true },
  todayIso: { type: String, required: true },
  selectedDateIso: { type: String, default: null },
  calendarLayers: { type: Array, default: () => [] },
  activeCalendarIds: { type: Array, default: () => ['spacex', 'f1', 'wtt'] }
})

const emit = defineEmits([
  'update:activeMonthIndex',
  'update:selected-date-iso',
  'update:active-calendar-ids',
  'select-mission'
])

// Provider Color Mapping (黑白灰调色板 Monochrome Palette)
const providerList = [
  { id: 'spacex', nameKey: 'calendar.filterSpaceX', defaultName: 'SpaceX', color: '#ffffff' },
  { id: 'f1', nameKey: 'calendar.filterF1', defaultName: 'F1', color: '#ef4444' },
  { id: 'wtt', nameKey: 'calendar.filterWTT', defaultName: 'WTT', color: '#f59e0b' },
  { id: 'rocketlab', nameKey: 'calendar.filterRocketLab', defaultName: 'Rocket Lab', color: '#e5e5e5' },
  { id: 'nasa', nameKey: 'calendar.filterNasa', defaultName: 'NASA', color: '#d4d4d4' },
  { id: 'casc', nameKey: 'calendar.filterCasc', defaultName: 'CASC', color: '#a3a3a3' },
  { id: 'blue-origin', nameKey: 'calendar.filterBlueOrigin', defaultName: 'Blue Origin', color: '#737373' },
  { id: 'other', nameKey: 'calendar.filterOther', defaultName: 'Others', color: '#525252' }
]

const activeCalendarView = ref('month') // 'day' | 'week' | 'month'

const currentWeekDays = computed(() => {
  if (!props.gridDays || props.gridDays.length === 0) return []
  const targetIso = props.selectedDateIso || props.todayIso
  const foundIndex = props.gridDays.findIndex(d => d.isoDate === targetIso)
  if (foundIndex >= 0) {
    const startOfWeekIndex = Math.floor(foundIndex / 7) * 7
    return props.gridDays.slice(startOfWeekIndex, startOfWeekIndex + 7)
  }
  return props.gridDays.slice(7, 14)
})

const currentDayFocus = computed(() => {
  if (!props.gridDays || props.gridDays.length === 0) return null
  const targetIso = props.selectedDateIso || props.todayIso
  const day = props.gridDays.find(d => d.isoDate === targetIso) || props.gridDays[0]
  return {
    ...day,
    events: sortCalendarEventsByStartTime(day.events),
  }
})

const navigateCalendar = (direction) => {
  if (activeCalendarView.value === 'month') {
    const nextIndex = props.activeMonthIndex + direction
    if (nextIndex < 0 || nextIndex >= props.monthKeys.length) return
    emit('update:activeMonthIndex', nextIndex)
    return
  }

  const anchorDate = props.selectedDateIso || props.todayIso
  const step = getCalendarNavigationStep(activeCalendarView.value)
  const nextDate = shiftCalendarDate(anchorDate, direction * step)
  if (nextDate) {
    emit('update:selected-date-iso', nextDate)
  }
}

const isCalendarActive = (calendarId) => props.activeCalendarIds.includes(calendarId)

const toggleCalendarLayer = (calendarId) => {
  const nextIds = isCalendarActive(calendarId)
    ? props.activeCalendarIds.filter((id) => id !== calendarId)
    : [...props.activeCalendarIds, calendarId]

  emit('update:active-calendar-ids', nextIds)
}

// ─── Subscribe Modal State & Actions ───
const showSubscribeModal = ref(false)
const subscribeProvider = ref('spacex')
const isCopied = ref(false)
const calendarIcsPaths = Object.freeze({
  spacex: '/spacex.ics',
  f1: '/ics/f1.ics',
  wtt: '/ics/wtt.ics'
})

const openSubscribeModal = (providerId = 'spacex') => {
  subscribeProvider.value = providerId
  showSubscribeModal.value = true
  isCopied.value = false
}

const activeSubscribeIcsUrl = computed(() => {
  const p = subscribeProvider.value
  const path = calendarIcsPaths[p] || calendarIcsPaths.spacex
  if (import.meta.client) {
    return `${window.location.origin}${path}`
  }
  return `https://calendarhub.mou7s.com${path}`
})

const activeSubscribeWebcalUrl = computed(() => {
  return getWebcalUrl(subscribeProvider.value)
})

const getWebcalUrl = (providerId = 'spacex') => {
  const path = calendarIcsPaths[providerId] || calendarIcsPaths.spacex
  if (import.meta.client) {
    const origin = window.location.origin.replace(/^https?:\/\//, '')
    return `webcal://${origin}${path}`
  }
  return `webcal://calendarhub.mou7s.com${path}`
}

const copyIcsUrl = () => {
  if (import.meta.client && activeSubscribeIcsUrl.value) {
    navigator.clipboard.writeText(activeSubscribeIcsUrl.value)
    isCopied.value = true
    setTimeout(() => { isCopied.value = false }, 2000)
  }
}

const getProviderColor = (providerId) => {
  const item = providerList.find(p => p.id === providerId)
  return item ? item.color : '#e5e5e5'
}

// 单击直接同时完成：高亮选中 + 在节点旁打开浮窗 + 调起任务详情
const selectedMission = ref(null)
const popoverEvent = ref(null)
const popoverStyle = ref({ top: '100px', left: '100px' })

const handleEventClick = (event, domEvent) => {
  if (domEvent) {
    domEvent.stopPropagation()
  }

  selectedMission.value = event

  // 计算弹窗精准附着在被点击的事件按钮右侧/下方
  if (domEvent && domEvent.currentTarget) {
    const rect = domEvent.currentTarget.getBoundingClientRect()
    let left = rect.right + 12
    let top = rect.top - 10

    // 防止浮窗超出右侧屏幕边界
    if (left + 320 > window.innerWidth) {
      left = Math.max(10, rect.left - 325)
    }

    // 防止浮窗超出底部屏幕边界
    if (top + 280 > window.innerHeight) {
      top = Math.max(10, window.innerHeight - 290)
    }

    popoverStyle.value = {
      left: `${left}px`,
      top: `${top}px`
    }
  }

  // 延迟微秒确保 click 事件冒泡周期完成
  setTimeout(() => {
    popoverEvent.value = event
  }, 10)

  emit('select-mission', event)
}

// 点击卡片外部区域自动收起气泡浮窗
const handleGlobalClick = (e) => {
  if (popoverEvent.value) {
    popoverEvent.value = null
  }
}

// ─── 实时当前时间指示器 ───
const nowTime = ref(new Date())
let timerId = null

const currentTimeTopPct = computed(() => {
  const h = nowTime.value.getHours()
  const m = nowTime.value.getMinutes()
  return ((h * 60 + m) / 1440) * 100
})

const currentTimeLabel = computed(() => {
  const h = String(nowTime.value.getHours()).padStart(2, '0')
  const m = String(nowTime.value.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
})

const isTodayInCurrentWeek = computed(() => {
  if (!currentWeekDays.value || !props.todayIso) return false
  return currentWeekDays.value.some(d => d.isoDate === props.todayIso)
})

// ─── 周视图 24 小时刻度自适应逻辑 ───
const hours24 = Array.from({ length: 24 }, (_, i) => i)
const timelineContainer = ref(null)
const containerHeight = ref(600)
let resizeObserver = null

const hourStep = computed(() => {
  if (containerHeight.value < 480) return 4
  if (containerHeight.value < 720) return 2
  return 1
})

const visibleHours = computed(() => {
  const step = hourStep.value
  return hours24.filter(h => h % step === 0)
})

const formatHourLabel = (hour) => {
  return `${String(hour).padStart(2, '0')}:00`
}

const getEventTopPct = (launchAt) => {
  if (!launchAt) return 0
  const date = new Date(launchAt)
  const h = date.getHours()
  const m = date.getMinutes()
  return ((h * 60 + m) / 1440) * 100
}

const getWeekEventStartMinutes = (launchAt) => {
  if (!launchAt) return 0
  const date = new Date(launchAt)
  if (Number.isNaN(date.getTime())) return 0
  return date.getHours() * 60 + date.getMinutes()
}

const getWeekEventDurationMinutes = (event) => {
  const start = Date.parse(event?.launchAt || '')
  const end = Date.parse(event?.launchWindow?.close || '')

  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return (end - start) / 60000
  }

  return 60
}

const getWeekEventStyle = (event, eventsInDay) => {
  const availableHeight = Math.max(1, containerHeight.value)
  const baseCardHeight = Math.min(50, Math.max(42, Math.round(availableHeight / 15)))
  const minVisualDuration = (baseCardHeight / availableHeight) * 1440
  const items = (eventsInDay || [])
    .filter(item => item?.launchAt)
    .map(item => {
      const startMinutes = getWeekEventStartMinutes(item.launchAt)
      const durationMinutes = Math.max(
        minVisualDuration,
        getWeekEventDurationMinutes(item)
      )
      const cardHeight = Math.min(
        86,
        Math.max(42, Math.round((durationMinutes / 1440) * availableHeight))
      )

      return {
        event: item,
        startMinutes,
        endMinutes: Math.min(1440, startMinutes + durationMinutes + 5),
        cardHeight
      }
    })
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes)

  // Pack events into lanes based on their visible time interval. This also
  // treats the minimum readable card height as occupied space, so adjacent
  // short events cannot visually cover one another.
  const laneEnds = []
  const placements = new Map()

  for (const item of items) {
    let lane = laneEnds.findIndex(endMinutes => endMinutes <= item.startMinutes)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(0)
    }

    laneEnds[lane] = item.endMinutes
    placements.set(item.event, { lane, cardHeight: item.cardHeight })
  }

  const laneCount = Math.max(1, laneEnds.length)
  const placement = placements.get(event) || { lane: 0, cardHeight: baseCardHeight }
  const lane = placement.lane
  const cardHeight = placement.cardHeight
  const widthPct = 100 / laneCount
  const topPct = Math.max(
    0,
    Math.min(getEventTopPct(event.launchAt), 100 - (cardHeight / availableHeight * 100))
  )
  const leftPct = widthPct * lane

  return {
    top: `${topPct}%`,
    height: `${cardHeight}px`,
    left: `calc(${leftPct}% + 1px)`,
    width: `calc(${widthPct}% - 2px)`
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('click', handleGlobalClick)

    if (window.ResizeObserver && timelineContainer.value) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.height > 0) {
            containerHeight.value = entry.contentRect.height
          }
        }
      })
      resizeObserver.observe(timelineContainer.value)
    }

    timerId = setInterval(() => {
      nowTime.value = new Date()
    }, 10000)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('click', handleGlobalClick)
    if (timerId) clearInterval(timerId)
    if (resizeObserver) resizeObserver.disconnect()
  }
})

watch(activeCalendarView, (val) => {
  if ((val === 'week' || val === 'day') && import.meta.client) {
    nextTick(() => {
      if (!timelineContainer.value) return
      containerHeight.value = timelineContainer.value.clientHeight || 600
      if (resizeObserver) resizeObserver.disconnect()
      if (window.ResizeObserver) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            if (entry.contentRect && entry.contentRect.height > 0) {
              containerHeight.value = entry.contentRect.height
            }
          }
        })
        resizeObserver.observe(timelineContainer.value)
      }
    })
  }
})

const weekdayHeaders = computed(() => {
  try {
    const formatter = new Intl.DateTimeFormat(displayLocale.value, { weekday: 'short' })
    const sundayFirst = Array.from({ length: 7 }, (_, index) => {
      return formatter.format(new Date(2021, 7, 1 + index))
    })
    return [...sundayFirst.slice(1), sundayFirst[0]]
  } catch (error) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  }
})

const monthTitleEnglish = computed(() => {
  const monthKey = props.monthKeys[props.activeMonthIndex]
  if (!monthKey) return 'July 2026'
  const [yearStr, monthStr] = monthKey.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1
  const d = new Date(year, month, 1)
  try {
    return d.toLocaleString(displayLocale.value, { month: 'long', year: 'numeric' })
  } catch (e) {
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  }
})

const lunarYearLabel = computed(() => {
  return showLunarCalendarLabels.value ? '丙午年' : ''
})

const getCompactEventTitle = (event) => {
  let title = String(event?.shortTitle || event?.title || 'Launch')
    .replace(/\s+(mission|flight test|unknown payload)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (event?.scores) {
    title = `[${event.scores}] ${title}`
  }

  return title || 'Launch'
}

const formatTimeShort = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString(displayLocale.value, { hour: 'numeric', minute: '2-digit', hour12: true })
}

const formatFullDateTime = (isoString) => {
  if (!isoString) return t('calendar.untimed')
  const d = new Date(isoString)
  return d.toLocaleString(displayLocale.value, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const jumpToToday = () => {
  if (!props.todayIso) return
  emit('update:selected-date-iso', props.todayIso)
}

const getEventStyleClass = (event) => {
  if (event.isLive) {
    return 'bg-white text-black font-extrabold shadow-md shadow-white/20'
  }
  return 'bg-[#262626] hover:bg-[#333333] text-[#ffffff]'
}
</script>

<style scoped>
.calendar-cell {
  container-type: inline-size;
}

.calendar-event {
  min-height: 1.75rem;
  align-items: flex-start;
  gap: 0.25rem;
}

.calendar-event-dot {
  margin-top: 0.25rem;
}

.calendar-event-title,
.calendar-event-time,
.calendar-event-live {
  display: none;
}

.calendar-event-compact {
  display: flex;
}

@container (min-width: 180px) {
  .calendar-event {
    min-height: 0;
    align-items: center;
    gap: 0.375rem;
  }

  .calendar-event-dot {
    margin-top: 0;
  }

  .calendar-event-title,
  .calendar-event-time,
  .calendar-event-live {
    display: block;
  }

  .calendar-event-live {
    display: inline-flex;
  }

  .calendar-event-compact {
    display: none;
  }
}

/* Fallback for browsers without container-query support. The calendar grid
   has enough room for the one-line layout on wide desktop screens. */
@media (min-width: 1440px) {
  .calendar-event {
    min-height: 0;
    align-items: center;
    gap: 0.375rem;
  }

  .calendar-event-dot {
    margin-top: 0;
  }

  .calendar-event-title,
  .calendar-event-time {
    display: block;
  }

  .calendar-event-live {
    display: inline-flex;
  }

  .calendar-event-compact {
    display: none;
  }
}

.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.view-fade-enter-from {
  opacity: 0;
  transform: scale(0.985) translateY(2px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: scale(1.01) translateY(-2px);
}
</style>
