<template>
  <div class="h-full w-full flex min-h-0 overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans select-none">
    
    <!-- 1. Left Sidebar (纯粹 iCloud 黑白灰侧边栏 - 移除左侧卡片) -->
    <aside
      class="w-60 flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col justify-between p-4 min-h-0 overflow-y-auto hidden md:flex"
    >
      <div class="space-y-6">
        <!-- Top App Title -->
        <div class="flex items-center justify-between">
          <div class="flex items-baseline gap-2.5">
            <div class="w-7 h-7 rounded-none bg-white flex items-center justify-center text-black shadow-md shadow-white/10">
              <UIcon name="i-lucide-calendar" class="w-4.5 h-4.5" />
            </div>
            <span class="text-lg font-extrabold tracking-wider text-[var(--text)] font-mono">CALENDAR</span>
            <span class="text-[8px] tracking-[0.2em] text-[var(--muted)] font-bold">HUB</span>
          </div>
        </div>

        <!-- Calendars Layer Checklist Section -->
        <div class="space-y-2 pt-2 border-t border-[var(--border)]">
          <label class="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--muted)] px-1 block">
            {{ t('calendar.sidebar.calendars') }}
          </label>

          <div class="space-y-1.5">
            <div
              v-for="layer in calendarLayers"
              :key="layer.id"
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-none hover:bg-[var(--border)] transition-colors group"
            >
              <button
                type="button"
                class="flex-1 flex items-center gap-2.5 cursor-pointer text-left min-w-0"
                :aria-pressed="isCalendarActive(layer.id)"
                @click="toggleCalendarLayer(layer.id)"
              >
                <div
                  class="w-4.5 h-4.5 rounded-none flex items-center justify-center transition-all duration-200 shrink-0"
                  :class="isCalendarActive(layer.id) ? 'text-black shadow-sm shadow-white/20' : 'border border-[var(--border)] text-transparent hover:border-[var(--border)]'"
                  :style="isCalendarActive(layer.id) ? { backgroundColor: layer.color } : undefined"
                >
                  <UIcon name="i-lucide-check" class="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span
                  class="text-xs font-semibold tracking-wide transition-colors truncate"
                  :class="isCalendarActive(layer.id) ? 'text-[var(--text)] font-bold' : 'text-[var(--muted)] line-through'"
                >
                  {{ layer.name }}
                </span>
              </button>

              <a
                :href="getWebcalUrl(layer.id)"
                class="px-2 py-1 text-[11px] font-bold rounded-none bg-blue-600 hover:bg-blue-500 text-[var(--text)] flex items-center gap-1 transition-all shadow-md shadow-blue-600/30 hover:scale-105 active:scale-95 shrink-0 cursor-pointer ml-2 no-underline"
                :title="t('subscribe.subscribeLink')"
                @click.stop
              >
                <UIcon name="i-lucide-rss" class="w-3.5 h-3.5" />
                <span>{{ t('subscribe.buttonShort') || 'Subscribe' }}</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Language Select in Sidebar -->
        <div class="space-y-2 pt-2 border-t border-[var(--border)]">
          <label class="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--muted)] px-1 block">
            {{ t('calendar.sidebar.language') }}
          </label>
          <USelectMenu
            v-model="activeLocaleCode"
            :items="languageOptions"
            value-key="value"
            label-key="label"
            icon="i-lucide-globe"
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
    <main class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--bg)]">
      
      <!-- Top Header Toolbar (黑白灰极简工具栏) -->
      <header class="h-auto min-h-14 border-b border-[var(--border)] px-3 py-2 grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2 shrink-0 bg-[var(--surface)] md:h-14 md:px-4 md:py-0 md:flex md:items-center md:justify-between">
        <!-- Left: Month Title + Lunar Year -->
        <div class="flex min-w-0 flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-2.5">
          <h1 class="w-full min-w-0 text-lg md:text-2xl font-extrabold text-[var(--text)] tracking-tight flex items-baseline gap-2 font-mono !mb-0 !leading-none !max-w-none truncate sm:w-auto">
            <span>{{ monthTitleEnglish }}</span>
            <span v-if="showLunarCalendarLabels" class="text-xs font-medium text-[var(--muted)] hidden md:inline leading-none">{{ lunarYearLabel }}</span>
          </h1>
          <span
            class="inline-flex min-w-0 max-w-[9.5rem] shrink items-center gap-1.5 text-[10px] font-mono font-bold tracking-tight text-[var(--muted)] md:max-w-[13rem] leading-none"
            :title="`${t('calendar.timezone')}: ${timezoneDisplay}`"
            :aria-label="`${t('calendar.timezone')}: ${timezoneDisplay}`"
          >
            <UIcon name="i-lucide-globe" class="h-3 w-3 shrink-0 opacity-70" />
            <span class="truncate leading-none translate-y-px">{{ timezoneDisplay }}</span>
          </span>
        </div>

        <!-- Center: Day / Week / Month Switcher (Apple Style Segmented Slider) -->
        <div class="relative hidden md:grid grid-cols-3 items-center bg-[var(--border)] p-0.5 rounded-none text-xs font-semibold select-none border border-[var(--border)]">
          <!-- Active Sliding Background - 完美匹配 1/3 等分，避免 px 计算误差 -->
          <div
            class="absolute top-0.5 bottom-0.5 w-[calc(33.333%-1.34px)] bg-[var(--btn-hover)] rounded-none shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
            :style="{
              left: activeCalendarView === 'day' ? '2px' : activeCalendarView === 'week' ? 'calc(33.333% + 0.67px)' : 'calc(66.666% - 0.67px)'
            }"
          ></div>

          <button
            type="button"
            class="relative z-10 flex items-center justify-center h-6 px-3.5 rounded-none transition-colors cursor-pointer leading-none translate-y-[0.5px]"
            :class="activeCalendarView === 'day' ? 'text-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'"
            @click="activeCalendarView = 'day'"
          >
            {{ t('calendar.viewDay') }}
          </button>

          <button
            type="button"
            class="relative z-10 flex items-center justify-center h-6 px-3.5 rounded-none transition-colors cursor-pointer leading-none translate-y-[0.5px]"
            :class="activeCalendarView === 'week' ? 'text-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'"
            @click="activeCalendarView = 'week'"
          >
            {{ t('calendar.viewWeek') }}
          </button>

          <button
            type="button"
            class="relative z-10 flex items-center justify-center h-6 px-3.5 rounded-none transition-colors cursor-pointer leading-none translate-y-[0.5px]"
            :class="activeCalendarView === 'month' ? 'text-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'"
            @click="activeCalendarView = 'month'"
          >
            {{ t('calendar.viewMonth') }}
          </button>
        </div>

        <!-- Right: Controls < Today > -->
        <div class="flex self-start items-center justify-self-end gap-2 sm:self-auto">
          <div class="flex h-8 items-center text-[var(--text)] text-sm font-semibold gap-1">
            <button
              type="button"
              class="flex h-8 w-7 items-center justify-center p-1 hover:bg-[var(--border)] rounded-none transition-colors text-[var(--muted)] hover:text-[var(--text)]"
              :disabled="activeCalendarView === 'month' && activeMonthIndex <= 0"
              @click="navigateCalendar(-1)"
            >
              <UIcon name="i-lucide-chevron-left" class="w-5 h-5" />
            </button>
            
            <button
              type="button"
              class="flex h-8 items-center justify-center px-2.5 py-1 hover:bg-[var(--border)] rounded-none transition-colors font-bold text-[var(--text)]"
              @click="jumpToToday"
            >
              {{ t('calendar.today') }}
            </button>

            <button
              type="button"
              class="flex h-8 w-7 items-center justify-center p-1 hover:bg-[var(--border)] rounded-none transition-colors text-[var(--muted)] hover:text-[var(--text)]"
              :disabled="activeCalendarView === 'month' && activeMonthIndex >= monthKeys.length - 1"
              @click="navigateCalendar(1)"
            >
              <UIcon name="i-lucide-chevron-right" class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Mobile View Switcher -->
        <div class="col-span-2 grid md:hidden grid-cols-3 items-center bg-[var(--border)] p-0.5 rounded-none text-[11px] font-semibold select-none border border-[var(--border)]">
          <button
            type="button"
            class="flex items-center justify-center h-7 px-2 rounded-none transition-colors cursor-pointer leading-none translate-y-[0.5px]"
            :class="activeCalendarView === 'day' ? 'bg-[var(--btn-hover)] text-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'"
            @click="activeCalendarView = 'day'"
          >
            {{ t('calendar.viewDay') }}
          </button>
          <button
            type="button"
            class="flex items-center justify-center h-7 px-2 rounded-none transition-colors cursor-pointer leading-none translate-y-[0.5px]"
            :class="activeCalendarView === 'week' ? 'bg-[var(--btn-hover)] text-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'"
            @click="activeCalendarView = 'week'"
          >
            {{ t('calendar.viewWeek') }}
          </button>
          <button
            type="button"
            class="flex items-center justify-center h-7 px-2 rounded-none transition-colors cursor-pointer leading-none translate-y-[0.5px]"
            :class="activeCalendarView === 'month' ? 'bg-[var(--btn-hover)] text-[var(--text)] font-bold' : 'text-[var(--muted)] hover:text-[var(--text)]'"
            @click="activeCalendarView = 'month'"
          >
            {{ t('calendar.viewMonth') }}
          </button>
        </div>

        <!-- Mobile Calendar Layers -->
        <div class="col-span-2 flex md:hidden items-center gap-1.5 min-w-0 overflow-x-auto scrollbar-none">
          <button
            v-for="layer in calendarLayers"
            :key="`mobile-${layer.id}`"
            type="button"
            class="flex-1 min-w-0 flex items-center justify-center gap-1 px-2 py-1 rounded-none border text-[10px] font-bold transition-colors cursor-pointer"
            :class="isCalendarActive(layer.id) ? 'bg-[var(--border)] border-[var(--border)] text-[var(--text)]' : 'bg-transparent border-[var(--border)] text-[var(--muted)]'"
            :aria-pressed="isCalendarActive(layer.id)"
            @click="toggleCalendarLayer(layer.id)"
          >
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: layer.color }"></span>
            <span class="truncate">{{ layer.name }}</span>
          </button>
        </div>

        <!-- Mobile Subscription & Language Actions -->
        <div class="col-span-2 flex md:hidden items-center gap-2 min-w-0">
          <button
            type="button"
            class="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-none border border-blue-500/60 bg-blue-600 text-[11px] font-bold text-[var(--text)] transition-colors hover:bg-blue-500"
            @click="openSubscribeModal(activeCalendarIds[0] || 'spacex')"
          >
            <UIcon name="i-lucide-rss" class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{{ t('subscribe.buttonShort') || 'Subscribe' }}</span>
          </button>
          <USelectMenu
            v-model="activeLocaleCode"
            :items="languageOptions"
            value-key="value"
            label-key="label"
            icon="i-lucide-globe"
            size="xs"
            color="neutral"
            variant="subtle"
            class="w-32 shrink-0"
            aria-label="Select Language"
          />
        </div>
      </header>

      <!-- Weekday Header Row (Month View Only) -->
      <div v-if="activeCalendarView === 'month'" class="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface)] shrink-0 text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
        <div
          v-for="(dayName, idx) in weekdayHeaders"
          :key="idx"
          :class="idx >= 5 ? 'text-[var(--text)] font-extrabold' : 'text-[var(--muted)]'"
        >
          {{ dayName }}
        </div>
      </div>

      <!-- Main Dynamic Calendar View Switcher with Smooth Animations -->
      <Transition name="view-fade" mode="out-in">
        <!-- 1. Month View (月视图：7 Cols x 6 Rows) -->
        <div v-if="activeCalendarView === 'month'" key="month-view" class="flex-1 grid grid-cols-7 grid-rows-6 min-h-0 overflow-hidden bg-[var(--border)] gap-[1px]">
          <div
            v-for="day in gridDays"
            :key="day.isoDate"
            class="calendar-cell h-full min-h-0 p-1 sm:p-1.5 flex flex-col justify-between overflow-hidden transition-colors"
            :class="{
              'bg-[var(--surface)]/80 text-[var(--muted)]': !day.isCurrentMonth,
              'bg-[var(--surface)] text-[var(--text)]': day.isCurrentMonth
            }"
          >
            <!-- Cell Header: Date Number + Lunar Term -->
            <div class="h-5 sm:h-6 flex items-center justify-between shrink-0 mb-0.5 sm:mb-1">
              <div class="flex items-center gap-0.5 sm:gap-1.5">
                <span
                  class="w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[10px] sm:text-xs font-bold flex items-center justify-center transition-all shrink-0"
                  :class="{
                    'bg-white text-black font-black shadow-md shadow-white/20': day.isoDate === todayIso,
                    'text-[var(--text)]': day.isoDate !== todayIso && day.isCurrentMonth,
                    'text-[var(--muted)]': !day.isCurrentMonth
                  }"
                >
                  {{ day.dayNumber }}
                </span>

                <span v-if="showLunarCalendarLabels" class="text-[10px] text-[var(--muted)] font-normal truncate max-w-[60px] leading-none">
                  {{ getLunarText(day.isoDate) }}
                </span>
              </div>

              <span v-if="day.events.length > 0" class="text-[8px] sm:text-[9px] font-bold text-[var(--muted)] leading-none">
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
                  selectedMission && (selectedMission.id === event.id || selectedMission.slug === event.slug) ? 'border-b-2 border-b-white bg-[var(--btn-hover)] text-[var(--text)] font-bold' : ''
                ]"
                :aria-label="`${event.title} ${formatTimeShort(event.launchAt)}`"
                @click="handleEventClick(event, $event)"
              >
                <span
                  v-if="!event.isLive"
                  class="calendar-event-dot w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0"
                  :style="{ backgroundColor: getProviderColor(event.provider) }"
                ></span>
                <span v-else class="calendar-event-live inline-flex items-center gap-1 shrink-0">
                  <span class="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span>
                  <span class="text-[9px] font-extrabold text-[var(--text)] animate-pulse">● LIVE</span>
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
                class="text-[9px] font-bold text-[var(--text)] hover:underline px-1 text-left shrink-0"
                @click="handleEventClick(day.events[3], $event)"
              >
                {{ t('calendar.moreEvents', { count: day.events.length - 3 }) }}
              </button>
            </div>
          </div>
        </div>

        <!-- 2. Week View (周视图：24小时刻度线纵向等分网格) -->
        <div v-else-if="activeCalendarView === 'week'" key="week-view" class="flex-1 flex flex-col min-h-0 overflow-hidden bg-[var(--bg)]">
          <!-- Week Header Row (带左侧 56px 时间轴占位 + 7 列日期头) -->
          <div class="flex border-b border-[var(--border)] bg-[var(--surface)] shrink-0 text-center py-2 text-xs font-bold uppercase tracking-wider select-none">
            <div class="w-14 shrink-0 border-r border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--muted)] font-mono">
              <UIcon name="i-lucide-clock" class="w-3.5 h-3.5 opacity-60" />
            </div>
            <div class="flex-1 grid grid-cols-7 gap-px">
              <div
                v-for="(day, idx) in currentWeekDays"
                :key="day.isoDate"
                class="flex flex-col items-center justify-center py-1 gap-1"
              >
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] font-bold" :class="idx >= 5 ? 'text-[var(--text)]' : 'text-[var(--muted)]'">
                    {{ weekdayHeaders[idx] }}
                  </span>
                  <span
                    class="w-5.5 h-5.5 rounded-full text-xs font-bold flex items-center justify-center transition-all shrink-0"
                    :class="day.isoDate === todayIso ? 'bg-white text-black font-black shadow-md shadow-white/20' : 'text-[var(--text)]'"
                  >
                    {{ day.dayNumber }}
                  </span>
                </div>
                <div v-if="showLunarCalendarLabels" class="text-[9px] text-[var(--muted)] font-normal truncate max-w-[60px] leading-none">
                  {{ getLunarText(day.isoDate) }}
                </div>
              </div>
            </div>
          </div>

          <!-- 24-Hour Non-Scrollable Adaptive Body -->
          <div ref="timelineContainer" class="flex-1 flex min-h-0 bg-[var(--surface)] relative overflow-hidden select-none">
            <!-- Left Adaptive 24-Hour Timeline Column -->
            <div class="w-14 shrink-0 bg-[var(--surface)] border-r border-[var(--border)] select-none relative z-20 pointer-events-none h-full">
              <div
                v-for="hour in visibleHours"
                :key="hour"
                class="absolute right-0 pr-2 text-[10px] font-mono text-[var(--muted)] -translate-y-1/2 flex items-center justify-end"
                :style="{ top: `${(hour / 24) * 100}%` }"
              >
                <span>{{ formatHourLabel(hour) }}</span>
              </div>

              <!-- Current Time Badge on Timeline Left -->
              <div
                v-if="isTodayInCurrentWeek"
                    class="absolute right-1 z-30 -translate-y-1/2 px-1 py-0.5 rounded-none text-[9px] font-mono font-bold bg-red-500 text-[var(--text)] shadow-sm shadow-red-500/50"
                :style="{ top: `${currentTimeTopPct}%` }"
              >
                {{ currentTimeLabel }}
              </div>
            </div>

            <!-- Right 7-Day Adaptive Timeline Canvas -->
            <div class="flex-1 grid grid-cols-7 relative bg-[var(--bg)] min-w-0 h-full">
              <!-- Background Hourly Lines (Highlighted on visible step hours) -->
              <div
                v-for="hour in hours24"
                :key="`line-${hour}`"
                class="absolute left-0 right-0 border-b pointer-events-none transition-colors"
                :class="hour % hourStep === 0 ? 'border-[var(--border)]/70' : 'border-[var(--border)]/30'"
                :style="{ top: `${(hour / 24) * 100}%` }"
              ></div>

              <!-- 7 Day Columns -->
              <div
                v-for="day in currentWeekDays"
                :key="`col-${day.isoDate}`"
                class="relative h-full border-r border-[var(--border)]/80 last:border-r-0"
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
                    class="absolute z-20 min-w-0 text-left px-1.5 py-1 rounded-none text-xs transition-all flex flex-col justify-center gap-0.5 cursor-pointer border border-[var(--border)] hover:border-[var(--text)] hover:z-30 shadow-lg group overflow-hidden"
                    :class="[
                      getEventStyleClass(event),
                      selectedMission && (selectedMission.id === event.id || selectedMission.slug === event.slug) ? 'ring-2 ring-white z-30 font-bold' : ''
                    ]"
                    :style="getWeekEventStyle(event, day.events)"
                    @click="handleEventClick(event, $event)"
                  >
                    <div class="flex items-center gap-1 min-w-0 w-full shrink-0">
                      <span v-if="!event.isLive" class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: getProviderColor(event.provider) }"></span>
                      <span v-else class="text-[9px] font-extrabold text-[var(--text)] animate-pulse">● LIVE</span>
                      <span class="text-[10px] font-bold font-mono opacity-90 truncate leading-none">{{ formatTimeShort(event.launchAt) }}</span>
                    </div>

                    <span class="truncate font-black text-[11px] leading-snug group-hover:text-[var(--text)] w-full">
                      {{ event.title }}
                    </span>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Day View (日视图：按 24 小时刻度定位) -->
        <div v-else key="day-view" class="flex-1 flex flex-col min-h-0 overflow-hidden p-3 sm:p-6 bg-[var(--surface)] gap-3 sm:gap-4">
          <div class="flex items-center justify-between border-b border-[var(--border)] pb-4 shrink-0">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-full bg-white text-black font-black flex items-center justify-center text-sm shadow-md shadow-white/20">
                {{ currentDayFocus?.dayNumber }}
              </span>
              <h2 class="text-xl font-bold text-[var(--text)] font-mono flex items-center gap-2">
                <span>{{ currentDayFocus?.isoDate }}</span>
                <span v-if="showLunarCalendarLabels" class="text-xs text-[var(--muted)] font-normal">({{ getLunarText(currentDayFocus?.isoDate) }})</span>
              </h2>
            </div>
            <span class="text-xs font-mono text-[var(--muted)]">
              {{ currentDayFocus?.events?.length || 0 }} {{ t('overview.launches') }}
            </span>
          </div>

          <!-- Empty Day State -->
          <div v-if="!currentDayFocus?.events?.length" class="flex-1 py-16 text-center text-[var(--muted)] space-y-2">
            <UIcon name="i-lucide-calendar-days" class="w-10 h-10 mx-auto opacity-40" />
            <p class="text-sm font-semibold">{{ t('calendar.noLaunches') }}</p>
          </div>

          <!-- Day Events Timeline -->
          <div v-else ref="timelineContainer" class="flex-1 flex min-h-0 bg-[var(--surface)] relative overflow-hidden select-none">
            <div class="w-14 shrink-0 bg-[var(--surface)] border-r border-[var(--border)] select-none relative z-20 pointer-events-none h-full">
              <div
                v-for="hour in visibleHours"
                :key="`day-hour-${hour}`"
                class="absolute right-0 pr-2 text-[10px] font-mono text-[var(--muted)] -translate-y-1/2 flex items-center justify-end"
                :style="{ top: `${(hour / 24) * 100}%` }"
              >
                <span>{{ formatHourLabel(hour) }}</span>
              </div>
            </div>

            <div class="flex-1 relative bg-[var(--bg)] min-w-0 h-full">
              <div
                v-for="hour in hours24"
                :key="`day-line-${hour}`"
                class="absolute left-0 right-0 border-b pointer-events-none"
                :class="hour % hourStep === 0 ? 'border-[var(--border)]/70' : 'border-[var(--border)]/30'"
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
                class="absolute z-20 min-w-0 text-left px-2 py-1 rounded-none text-xs transition-all flex flex-col justify-center gap-0.5 cursor-pointer border border-[var(--border)] hover:border-[var(--text)] hover:z-30 shadow-lg group overflow-hidden"
                :class="[
                  getEventStyleClass(event),
                  selectedMission && (selectedMission.id === event.id || selectedMission.slug === event.slug) ? 'ring-2 ring-white z-30 font-bold' : ''
                ]"
                :style="getWeekEventStyle(event, currentDayFocus.events)"
                @click="handleEventClick(event, $event)"
              >
                <div class="flex items-center gap-1 min-w-0 w-full shrink-0">
                  <span v-if="event.isLive" class="text-[9px] font-extrabold text-[var(--text)] animate-pulse">● LIVE</span>
                  <span v-else-if="event.scores" class="text-[10px] font-bold text-amber-400 font-mono shrink-0">{{ event.scores }}</span>
                  <span v-else class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ backgroundColor: getProviderColor(event.provider) }"></span>
                  <span class="text-[10px] font-bold font-mono opacity-90 truncate leading-none">{{ formatTimeShort(event.launchAt) }}</span>
                </div>
                <span class="truncate font-black text-[11px] leading-snug group-hover:text-[var(--text)] w-full">{{ event.title }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </main>

    <!-- 3. Minimalist Event Detail Floating Card (极简气泡卡片 - 消除嵌套圆角框，专注内容) -->
    <div
      v-if="popoverEvent"
      class="fixed z-50 w-[calc(100vw-20px)] max-w-[300px] bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-none shadow-2xl p-4 space-y-3 font-sans animate-fadeIn"
      :style="popoverStyle"
      @click.stop
    >
      <!-- Top Row: Provider Text & Close Button -->
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-mono font-bold tracking-widest text-[var(--muted)] uppercase">
          {{ popoverEvent.providerName || popoverEvent.provider || 'SPACEX' }}
        </span>
        <button
          type="button"
          class="text-[var(--muted)] hover:text-[var(--text)] p-1 rounded-none transition-colors"
          @click.stop="popoverEvent = null"
          aria-label="Close Floating Card"
        >
          <UIcon name="i-lucide-x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Title, Scores & Live Badge -->
      <div>
        <div v-if="popoverEvent.isLive" class="flex items-center gap-1.5 text-[10px] font-bold text-[#ef4444] uppercase tracking-wider mb-1 font-mono">
          <span class="w-2 h-2 rounded-full bg-[#ef4444] animate-ping"></span>
          <span>{{ t('status.liveNow') }}</span>
        </div>
        <div v-else-if="popoverEvent.scores" class="flex items-center justify-between p-2 bg-[var(--surface)] border border-[var(--border)] mb-2">
          <span class="text-amber-400 font-bold font-mono text-xs">{{ t(getCalendarEventPresentation(popoverEvent).scoreLabelKey || 'calendar.wtt.finalScore') }}: {{ popoverEvent.scores }}</span>
          <span v-if="popoverEvent.winner" class="text-[10px] text-neutral-300 font-semibold truncate max-w-[130px]">
            {{ t(getCalendarEventPresentation(popoverEvent).winnerLabelKey || 'calendar.wtt.winner') }}: <strong class="text-[var(--text)]">{{ popoverEvent.winner }}</strong>
          </span>
        </div>
        <h3 class="text-base font-black text-[var(--text)] uppercase font-mono leading-snug">
          {{ popoverEvent.title }}
        </h3>
      </div>

      <!-- Direct Details Content (移除深色嵌套内盒) -->
      <div class="space-y-2 text-xs text-[var(--muted)] pt-2 border-t border-[var(--border)]">
        <div class="flex items-center gap-2.5">
          <UIcon name="i-lucide-clock" class="w-4 h-4 text-[var(--muted)] shrink-0" />
          <span class="font-bold text-[var(--text)] font-mono">{{ formatFullDateTime(popoverEvent.launchAt) }}</span>
        </div>

        <div v-if="popoverEvent.vehicle" class="flex items-center gap-2.5">
          <UIcon :name="getCalendarEventPresentation(popoverEvent).vehicleIcon" class="w-4 h-4 text-[var(--muted)] shrink-0" />
          <span class="truncate text-[var(--text)]">{{ t(getCalendarEventPresentation(popoverEvent).vehicleLabelKey) }}: <strong class="text-[var(--text)]">{{ popoverEvent.vehicle }}</strong></span>
        </div>

        <div v-if="popoverEvent.gameScores?.length" class="flex items-start gap-2.5">
          <UIcon name="i-lucide-list" class="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
          <span class="leading-relaxed text-[var(--text)]">{{ t(getCalendarEventPresentation(popoverEvent).gamesLabelKey || 'calendar.wtt.games') }}: <strong class="text-[var(--text)] font-mono">{{ popoverEvent.gameScores.join(', ') }}</strong></span>
        </div>

        <div v-if="popoverEvent.launchSite" class="flex items-start gap-2.5">
          <UIcon :name="getCalendarEventPresentation(popoverEvent).locationIcon" class="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
          <span class="leading-relaxed text-[var(--text)]">{{ t(getCalendarEventPresentation(popoverEvent).locationLabelKey) }}: <strong class="text-[var(--text)]">{{ popoverEvent.launchSite }}</strong></span>
        </div>
      </div>

      <!-- Clean Action Button -->
      <div v-if="popoverEvent.missionUrl" class="pt-1">
        <NuxtLink
          :to="popoverEvent.missionUrl"
          target="_blank"
          class="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-[var(--text)] bg-[var(--border)] hover:bg-[var(--border)] border border-[var(--border)] rounded-none transition-colors"
        >
          <span>{{ t('mission.viewOfficialDetails') }}</span>
          <UIcon name="i-lucide-external-link" class="w-3.5 h-3.5 text-[var(--muted)]" />
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
            class="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-none p-6 shadow-2xl text-[var(--text)] space-y-5"
          >
            <!-- 头部说明与关闭按钮 -->
            <div class="flex items-start justify-between">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="p-2 rounded-none bg-blue-600/20 text-blue-400 flex items-center justify-center">
                    <UIcon name="i-lucide-rss" class="w-5 h-5" />
                  </span>
                  <h3 class="text-base font-bold tracking-tight text-[var(--text)]">
                    {{ t('subscribe.title') }}
                  </h3>
                </div>
                <p class="text-xs text-[var(--muted)] leading-relaxed pt-1">
                  {{ t('subscribe.copy') }}
                </p>
              </div>
              <button
                type="button"
                class="p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-none transition-colors cursor-pointer shrink-0"
                @click="showSubscribeModal = false"
              >
                <UIcon name="i-lucide-x" class="w-5 h-5" />
              </button>
            </div>

            <!-- 核心一键订阅按钮 -->
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="layer in calendarLayers"
                :key="`subscribe-${layer.id}`"
                type="button"
                class="min-w-0 px-2 py-1.5 border text-[10px] font-bold truncate transition-colors"
                :class="subscribeProvider === layer.id ? 'border-blue-500 bg-blue-600/20 text-[var(--text)]' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border)]'"
                :aria-pressed="subscribeProvider === layer.id"
                @click="subscribeProvider = layer.id; isCopied = false"
              >
                {{ layer.name }}
              </button>
            </div>

            <a
              :href="activeSubscribeWebcalUrl"
              class="w-full py-3 px-4 rounded-none bg-blue-600 hover:bg-blue-500 text-[var(--text)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] cursor-pointer no-underline"
            >
              <UIcon name="i-lucide-calendar-days" class="w-4 h-4" />
              <span>{{ t('subscribe.subscribeLink') }}</span>
            </a>

            <!-- 复制 ICS 链接 -->
            <div class="space-y-2 pt-3 border-t border-[var(--border)]">
              <label class="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--muted)] block">
                {{ t('subscribe.eyebrow') }} (Google / Web)
              </label>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  readonly
                  :value="activeSubscribeIcsUrl"
                  class="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-none px-3 py-2 text-xs font-mono text-[var(--text)] focus:outline-none select-all"
                />
                <button
                  type="button"
                  class="px-3 py-2 text-xs font-bold rounded-none bg-[var(--surface-strong)] hover:bg-[var(--surface-strong)] text-[var(--text)] flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                  @click="copyIcsUrl"
                >
                  <UIcon :name="isCopied ? 'i-lucide-check' : 'i-lucide-clipboard'" class="w-4 h-4 text-blue-400" />
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

const timezoneDisplay = ref('UTC')
const isClientReady = ref(false)

const updateTimezoneDisplay = () => {
  if (!import.meta.client) return

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  try {
    const offsetPart = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value || 'GMT'
    const utcOffset = offsetPart === 'GMT' ? 'UTC+00:00' : offsetPart.replace(/^GMT/, 'UTC')
    timezoneDisplay.value = `${utcOffset} · ${timeZone}`
  } catch {
    timezoneDisplay.value = timeZone
  }
}

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
  activeCalendarIds: { type: Array, default: () => ['spacex', 'f1', 'wtt', 'dota2'] }
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
  { id: 'dota2', nameKey: 'calendar.filterDota2', defaultName: 'Dota 2', color: '#8b5cf6' },
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
  wtt: '/ics/wtt.ics',
  dota2: '/ics/dota2.ics'
})

const openSubscribeModal = (providerId = 'spacex') => {
  subscribeProvider.value = providerId
  showSubscribeModal.value = true
  isCopied.value = false
}

const activeSubscribeIcsUrl = computed(() => {
  const p = subscribeProvider.value
  const path = calendarIcsPaths[p] || calendarIcsPaths.spacex
  if (isClientReady.value && import.meta.client) {
    return `${window.location.origin}${path}`
  }
  return `https://calendarhub.mou7s.com${path}`
})

const activeSubscribeWebcalUrl = computed(() => {
  return getWebcalUrl(subscribeProvider.value)
})

const getWebcalUrl = (providerId = 'spacex') => {
  const path = calendarIcsPaths[providerId] || calendarIcsPaths.spacex
  if (isClientReady.value && import.meta.client) {
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
    isClientReady.value = true
    updateTimezoneDisplay()
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
  // 已完场比赛（带比分）降低视觉权重，与未赛区分
  if (event.status === 'Finished' && event.scores) {
    return 'bg-[var(--surface)] hover:bg-[var(--surface-strong)] text-neutral-400'
  }
  return 'bg-[var(--border)] hover:bg-[var(--border)] text-[var(--text)]'
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
