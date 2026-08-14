<template>
  <div class="page-shell">
    <div
      v-if="upcomingError"
      class="fixed left-1/2 top-3 z-[60] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-3 border border-red-500/40 bg-[#241414] px-3 py-2 text-xs text-red-100 shadow-xl"
      role="alert"
      aria-live="assertive"
    >
      <span>{{ t("calendar.dataLoadError") }}</span>
      <button
        type="button"
        class="shrink-0 font-bold text-white underline underline-offset-2 disabled:cursor-wait disabled:opacity-60"
        :disabled="isRefreshingLaunches"
        @click="refreshLaunches"
      >
        {{ isRefreshingLaunches ? t("calendar.refreshing") : t("calendar.retry") }}
      </button>
    </div>

    <main class="flex-1 flex flex-col min-h-0 overflow-hidden">
      <LaunchCalendar
        id="calendar"
        :grid-days="gridDays"
        :month-keys="monthKeys"
        :active-month-index="activeMonthIndex"
        :today-iso="todayIso"
        :selected-date-iso="selectedDateIso"
        :calendar-layers="calendarLayers"
        :active-calendar-ids="activeCalendarIds"
        @update:active-month-index="setActiveMonthIndex"
        @update:active-calendar-ids="activeCalendarIds = $event"
        @select-mission="selectMission"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useHead, useFetch, useSeoMeta } from "#app";
import {
  buildCalendarMonthKeys,
  resolveCalendarMonthIndex,
} from "~/utils/calendar-month";

const { t, locale } = useI18n();

// ─── Data Fetching ───
const {
  data: upcomingPayload,
  error: upcomingError,
  refresh: refreshUpcoming,
} = await useFetch("/api/launches");
const { data: historyPayload } = await useFetch("/api/history-launches");
const { data: f1Payload } = await useFetch("/api/calendar/f1");
const { data: wttPayload, refresh: refreshWtt } = await useFetch("/api/calendar/wtt");

const LAUNCH_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const isRefreshingLaunches = ref(false);
let launchRefreshTimer = null;

const refreshLaunches = async () => {
  if (!import.meta.client || isRefreshingLaunches.value) return;

  isRefreshingLaunches.value = true;
  try {
    await Promise.allSettled([refreshUpcoming(), refreshWtt()]);
  } finally {
    isRefreshingLaunches.value = false;
  }
};

const refreshVisibleLaunches = () => {
  if (document.visibilityState === "visible") {
    void refreshLaunches();
  }
};

onMounted(() => {
  void refreshLaunches();
  launchRefreshTimer = window.setInterval(
    refreshVisibleLaunches,
    LAUNCH_REFRESH_INTERVAL_MS,
  );
  window.addEventListener("focus", refreshVisibleLaunches);
  document.addEventListener("visibilitychange", refreshVisibleLaunches);
});

onUnmounted(() => {
  if (launchRefreshTimer) {
    window.clearInterval(launchRefreshTimer);
  }
  window.removeEventListener("focus", refreshVisibleLaunches);
  document.removeEventListener("visibilitychange", refreshVisibleLaunches);
});

// ─── SEO & Data ───
const nextLaunch = computed(() => upcomingPayload.value?.nextLaunch);

const computedTitle = computed(() => {
  return t('meta.title');
});

// ─── Calendar Layers ───
const activeCalendarIds = ref(["spacex", "f1", "wtt"]);
const calendarLayers = computed(() => [
  {
    id: "spacex",
    name: t("calendar.filterSpaceX"),
    color: "#ffffff",
    icsPath: "/spacex.ics",
  },
  {
    id: "f1",
    name: t("calendar.filterF1"),
    color: "#ef4444",
    icsPath: "/ics/f1.ics",
  },
  {
    id: "wtt",
    name: t("calendar.filterWTT"),
    color: "#f59e0b",
    icsPath: "/ics/wtt.ics",
  },
]);

// ─── Subscription Links ───
const currentIcsPath = computed(() => "/spacex.ics");

const webcalSubscriptionLink = computed(() => {
  const path = currentIcsPath.value;
  if (import.meta.client) {
    const httpUrl = new URL(path, window.location.href);
    return `webcal://${httpUrl.host}${httpUrl.pathname}${httpUrl.search}`;
  }
  return `webcal://calendarhub.mou7s.com${path}`;
});

// ─── Calendar Integration (Upcoming & History) ───
const sortedCalendarMissions = computed(() => {
  let upcoming = (upcomingPayload.value?.missions || []).map((m) => ({
    ...m,
    calendarId: "spacex",
    calendarGroup: "upcoming",
    key: `upcoming:${m.slug || m.id}`,
  }));
  let history = (historyPayload.value?.missions || []).map((m) => ({
    ...m,
    calendarId: "spacex",
    provider: "spacex",
    providerName: "SpaceX",
    calendarGroup: "history",
    key: `history:${m.slug || m.id}`,
  }));

  const f1 = (f1Payload.value?.missions || []).map((m) => {
    const isChinese = locale.value === "zh-CN";
    return {
      ...m,
      calendarId: "f1",
      provider: "f1",
      providerName: "F1",
      title: isChinese ? (m.titleZh || m.title) : (m.titleEn || m.title),
      shortTitle: isChinese
        ? (m.shortTitleZh || m.shortTitle || m.titleZh || m.title)
        : (m.shortTitleEn || m.shortTitle || m.titleEn || m.title),
      calendarGroup: "upcoming",
      key: `f1:${m.id}`,
    };
  });

  const wtt = (wttPayload.value?.missions || []).map((m) => {
    const isChinese = locale.value === "zh-CN";
    return {
      ...m,
      calendarId: "wtt",
      provider: "wtt",
      providerName: "WTT",
      title: isChinese ? (m.titleZh || m.title) : (m.titleEn || m.title),
      shortTitle: isChinese
        ? (m.shortTitleZh || m.shortTitle || m.titleZh || m.title)
        : (m.shortTitleEn || m.shortTitle || m.titleEn || m.title),
      calendarGroup: "upcoming",
      key: `wtt:${m.id}`,
    };
  });

  return [...upcoming, ...history, ...f1, ...wtt]
    .filter((m) => activeCalendarIds.value.includes(m.calendarId))
    .filter((m) => m.launchAt)
    .sort((a, b) => {
      return Date.parse(b.launchAt) - Date.parse(a.launchAt); // Newest first
    });
});

// ─── Local Timezone Date Helpers ───
const getLocalDateParts = (dateInput) => {
  if (!dateInput) return null;
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return {
    year,
    month,
    day,
    monthKey: `${year}-${month}`,
    dateIso: `${year}-${month}-${day}`,
  };
};

const getLocalDateIso = (dateInput = new Date()) => {
  const parts = getLocalDateParts(dateInput);
  return parts ? parts.dateIso : "";
};

const todayIso = computed(() => getLocalDateIso(new Date()));

const monthKeys = computed(() => {
  const currentMonthKey = todayIso.value.slice(0, 7);
  const missionMonthKeys = [];

  for (const mission of sortedCalendarMissions.value) {
    if (!mission.launchAt) continue;
    const parts = getLocalDateParts(mission.launchAt);
    if (!parts) continue;
    missionMonthKeys.push(parts.monthKey);
  }

  return buildCalendarMonthKeys(missionMonthKeys, currentMonthKey);
});

const activeMonthIndex = ref(-1);
const selectedMonthKey = ref("");
const activeMonthKey = computed(() => monthKeys.value[activeMonthIndex.value]);

const setActiveMonthIndex = (index) => {
  activeMonthIndex.value = index;
  selectedMonthKey.value = monthKeys.value[index] || "";
};

// Prefer the current month, while preserving a month manually selected by the user.
watch(
  [monthKeys, nextLaunch],
  () => {
    const nextLaunchMonthKey = nextLaunch.value?.launchAt
      ? getLocalDateParts(nextLaunch.value.launchAt)?.monthKey || ""
      : "";
    const index = resolveCalendarMonthIndex(
      monthKeys.value,
      todayIso.value.slice(0, 7),
      nextLaunchMonthKey,
      selectedMonthKey.value,
    );

    if (index >= 0) {
      activeMonthIndex.value = index;
      selectedMonthKey.value = monthKeys.value[index] || "";
    }
  },
  { immediate: true },
);

const monthMissions = computed(() => {
  const monthKey = activeMonthKey.value;
  if (!monthKey) return [];
  return sortedCalendarMissions.value.filter((mission) => {
    if (!mission.launchAt) return false;
    const parts = getLocalDateParts(mission.launchAt);
    return parts?.monthKey === monthKey;
  });
});

// ─── Calendar Grid Days ───
const gridDays = computed(() => {
  const monthKey = activeMonthKey.value;
  if (!monthKey) return [];

  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;

  const monthStart = new Date(year, monthIndex, 1);
  const firstDayIndex = (monthStart.getDay() + 6) % 7; // 以周一为第一天 (0 = Mon, 6 = Sun)
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;
  const days = [];

  // 按本地日期归类当前月份的所有事件
  const eventsByDate = new Map();
  for (const m of monthMissions.value) {
    if (!m.launchAt) continue;
    const parts = getLocalDateParts(m.launchAt);
    if (!parts) continue;
    const dStr = parts.dateIso;
    if (!eventsByDate.has(dStr)) {
      eventsByDate.set(dStr, []);
    }
    eventsByDate.get(dStr).push(m);
  }

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex += 1) {
    const dayOffset = cellIndex - firstDayIndex;
    const date = new Date(year, monthIndex, dayOffset + 1);
    const parts = getLocalDateParts(date);
    const isoDate = parts ? parts.dateIso : "";
    const dayEvents = eventsByDate.get(isoDate) || [];

    days.push({
      isoDate,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === monthIndex,
      hasEvents: dayEvents.length > 0,
      events: dayEvents,
    });
  }

  return days;
});

const selectedDateIso = ref(null);
const selectedMission = ref(null);

const selectMission = (mission) => {
  selectedMission.value = mission;
};

// ─── FAQ for Schema ───
const getFaqQuestion = (num) => {
  return t(`faq.q${num}`);
};

const getFaqAnswer = (num) => {
  return t(`faq.a${num}`, { link: webcalSubscriptionLink.value });
};

useSeoMeta({
  title: computedTitle,
  ogTitle: computedTitle,
  description: () => t("meta.description"),
  ogDescription: () => t("meta.description"),
  ogType: "website",
  ogImage: "/icon-512.png",
  twitterCard: "summary",
  twitterTitle: computedTitle,
  twitterDescription: () => t("meta.description"),
  twitterImage: "/icon-512.png",
});

// useHead 现在专用于处理复杂的非普通元数据标签（例如注入 JSON-LD 谷歌结构化数据）
useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": "https://calendarhub.mou7s.com/#website",
            url: "https://calendarhub.mou7s.com/",
            name: t("meta.title"),
            description: t("meta.description"),
            publisher: {
              "@type": "Organization",
              name: "Calendar Hub Team",
            },
            hasPart: [
              {
                "@type": "WebPage",
                "@id": "https://calendarhub.mou7s.com/#subscribe",
                name: t("subscribe.title"),
                url: "https://calendarhub.mou7s.com/#subscribe",
              },
              {
                "@type": "WebPage",
                "@id": "https://calendarhub.mou7s.com/#calendar",
                name: t("calendar.title"),
                url: "https://calendarhub.mou7s.com/#calendar",
              },
              {
                "@type": "WebPage",
                "@id": "https://calendarhub.mou7s.com/#faq",
                name: t("faq.title"),
                url: "https://calendarhub.mou7s.com/#faq",
              },
            ],
          },
          {
            "@type": "SoftwareApplication",
            "@id": "https://calendarhub.mou7s.com/#software",
            name: "Calendar Hub PWA",
            operatingSystem: "All",
            applicationCategory: "UtilitiesApplication",
            offers: {
              "@type": "Offer",
              price: "0.00",
              priceCurrency: "USD",
            },
          },
          {
            "@type": "FAQPage",
            "@id": "https://calendarhub.mou7s.com/#faq-page",
            mainEntity: [1, 2, 3, 4].map((num) => ({
              "@type": "Question",
              name: getFaqQuestion(num),
              acceptedAnswer: {
                "@type": "Answer",
                text: getFaqAnswer(num).replace(/<[^>]+>/g, ""),
              },
            })),
          },
          nextLaunch.value?.launchAt
            ? {
                "@type": "Event",
                name: nextLaunch.value.title,
                startDate: nextLaunch.value.launchAt,
                location: {
                  "@type": "Place",
                  name: nextLaunch.value.launchSite || "TBD",
                  address: nextLaunch.value.launchSite || "TBD",
                },
                description: `${nextLaunch.value.vehicle} launch tracking: ${nextLaunch.value.title} scheduled flight.`,
              }
            : null,
        ].filter(Boolean),
      }),
    },
  ],
}));
</script>

<style>
/* Custom global adjustments */
body {
  margin: 0;
  padding: 0;
}
</style>
