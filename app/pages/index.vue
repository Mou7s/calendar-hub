<template>
  <div class="page-shell">
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
        @update:active-month-index="activeMonthIndex = $event"
        @update:active-calendar-ids="activeCalendarIds = $event"
        @select-mission="selectMission"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useHead, useFetch, useSeoMeta } from "#app";

const { t, locale } = useI18n();

// ─── Data Fetching ───
const { data: upcomingPayload } = await useFetch("/api/launches");
const { data: historyPayload } = await useFetch("/api/history-launches");
const { data: f1Payload } = await useFetch("/api/calendar/f1");

// ─── SEO & Data ───
const nextLaunch = computed(() => upcomingPayload.value?.nextLaunch);

const computedTitle = computed(() => {
  return t('meta.title');
});

// ─── Calendar Layers ───
const activeCalendarIds = ref(["spacex", "f1"]);
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

  return [...upcoming, ...history, ...f1]
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

const monthKeys = computed(() => {
  const keys = [];
  const seen = new Set();

  for (const mission of sortedCalendarMissions.value) {
    if (!mission.launchAt) continue;
    const parts = getLocalDateParts(mission.launchAt);
    if (!parts) continue;
    if (!seen.has(parts.monthKey)) {
      seen.add(parts.monthKey);
      keys.push(parts.monthKey);
    }
  }

  return keys.sort((a, b) => a.localeCompare(b));
});

const activeMonthIndex = ref(0);
const activeMonthKey = computed(() => monthKeys.value[activeMonthIndex.value]);

// Set default active month to next launch's month
watch(
  [monthKeys, nextLaunch],
  () => {
    if (nextLaunch.value?.launchAt) {
      const parts = getLocalDateParts(nextLaunch.value.launchAt);
      if (parts) {
        const idx = monthKeys.value.indexOf(parts.monthKey);
        if (idx >= 0) {
          activeMonthIndex.value = idx;
        }
      }
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

const todayIso = computed(() => getLocalDateIso(new Date()));
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
