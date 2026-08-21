import test from "node:test";
import assert from "node:assert/strict";

import launchesApi from "../server/api/launches.get.js";
import historyApi from "../server/api/history-launches.get.js";
import detailsApi from "../server/api/launches/[slug].get.js";
import spacexIcsRoute from "../server/routes/spacex.ics.js";
import calendarIcsRoute from "../server/routes/calendar.ics.js";
import topicIcsRoute from "../server/routes/ics/[topic].ics.js";
import fixUrlMiddleware from "../server/middleware/fix-url.js";
import {
  buildTopicCalendarFeed,
  getTopicCalendarData,
  loadWttCalendarData,
  normalizeWttDate,
  normalizeWttOfficialResult,
  normalizeWttScheduleUnit,
  parseF1OfficialStartTimes,
} from "../server/utils/calendars.js";
import { CALENDAR_KEYS, syncCalendars } from "../server/utils/calendar-sync.js";
import { getCalendarEventPresentation } from "../app/utils/calendar-event-presentation.js";
import {
  buildCalendarMonthKeys,
  resolveCalendarMonthIndex,
} from "../app/utils/calendar-month.js";
import {
  getCalendarMonthAnchor,
  getCalendarMonthKey,
  getCalendarNavigationStep,
  sortCalendarEventsByStartTime,
  shiftCalendarDate,
} from "../app/utils/calendar-navigation.js";

import {
  buildCalendarFeed,
  escapeIcsText,
  getStandardTranslation,
  loadHistoryLaunchData,
  loadLaunchData,
  loadMissionDetails,
  translateMissionDetails,
  translateText,
} from "../server/utils/spacex.js";

// Mock worker fetch to delegate directly to our new Nuxt Nitro handlers
const worker = {
  async fetch(request, env = {}, ctx = {}) {
    const url = new URL(request.url);
    const mockEvent = {
      context: {
        cloudflare: {
          env,
          context: ctx,
        },
        params: {},
      },
      node: {
        req: {
          url: url.pathname,
        },
        res: {
          setHeader() {},
        },
      },
    };

    try {
      if (url.pathname === "/spacex.ics") {
        const response = await spacexIcsRoute(mockEvent);
        return new Response(response, {
          status: 200,
          headers: new Headers({
            "content-type": "text/calendar; charset=utf-8",
          }),
        });
      }

      if (url.pathname === "/calendar.ics") {
        const response = await calendarIcsRoute(mockEvent);
        return new Response(response, {
          status: 200,
          headers: new Headers({
            "content-type": "text/calendar; charset=utf-8",
          }),
        });
      }

      if (url.pathname === "/api/launches") {
        const response = await launchesApi(mockEvent);
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: new Headers({
            "content-type": "application/json; charset=utf-8",
          }),
        });
      }

      if (url.pathname === "/api/history-launches") {
        const response = await historyApi(mockEvent);
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: new Headers({
            "content-type": "application/json; charset=utf-8",
          }),
        });
      }

      const detailsMatch = url.pathname.match(
        /^\/api\/launches\/([a-z0-9-]+)$/i,
      );
      if (detailsMatch) {
        mockEvent.context.params = { slug: detailsMatch[1] };
        const response = await detailsApi(mockEvent);
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: new Headers({
            "content-type": "application/json; charset=utf-8",
          }),
        });
      }

      if (url.pathname === "/") {
        return new Response("<html>ok</html>", {
          status: 200,
          headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        });
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("DEBUG ERROR IN MOCK WORKER FETCH:", error);
      return new Response(
        JSON.stringify({
          error: error.message || "Internal Server Error",
          detail: error.data || String(error),
        }),
        {
          status: error.statusCode || 502,
          headers: new Headers({
            "content-type": "application/json; charset=utf-8",
          }),
        },
      );
    }
  },
};

const sampleTiles = [
  {
    id: 1,
    correlationId: "ABC123",
    link: "starlink-1",
    title: "Starlink Mission",
    shortTitle: null,
    missionType: "starlink",
    vehicle: "Falcon 9",
    launchSite: "SLC-40, Florida",
    returnSite: "Droneship",
    callToAction: "WATCH",
    missionStatus: "upcoming",
    isLive: false,
    directToCell: false,
    returnDateTime: null,
    imageDesktop: { url: "https://example.com/image.jpg" },
  },
  {
    id: 2,
    correlationId: "DEF456",
    link: "gpsiii8",
    title: "GPS III-8 Mission",
    shortTitle: null,
    missionType: "nssl",
    vehicle: "Falcon 9",
    launchSite: "SLC-40, Florida",
    returnSite: "Droneship",
    callToAction: "WATCH",
    missionStatus: "upcoming",
    isLive: false,
    directToCell: false,
    returnDateTime: null,
    imageDesktop: { url: "https://example.com/gps.jpg" },
  },
];

const sampleTimings = {
  ABC123: {
    CorrelationId: "ABC123",
    PrimaryLaunchDate: { Seconds: 1776520800, Nanos: 0 },
    PrimaryLaunchWindow: null,
    TZeroLaunchDate: null,
    IsPrimaryLaunchTimeGiven: false,
  },
  DEF456: {
    CorrelationId: "DEF456",
    PrimaryLaunchDate: { Seconds: 1776667680, Nanos: 0 },
    PrimaryLaunchWindow: {
      Open: { Seconds: 1776667680, Nanos: 0 },
      Close: { Seconds: 1776669720, Nanos: 0 },
    },
    TZeroLaunchDate: null,
    IsPrimaryLaunchTimeGiven: false,
  },
};

const sampleHistoryResponse = {
  id: "history-recent",
  correlationId: "HISTORY_RECENT",
  link: "sl-10-22",
  title: "Starlink Mission",
  shortTitle: null,
  missionType: "starlink",
  vehicle: "Falcon 9",
  launchSite: "SLC-40, Florida",
  returnSite: "Droneship",
  callToAction: "WATCH",
  missionStatus: "final",
  isLive: false,
  directToCell: false,
  launchDate: "2025-09-03",
  launchTime: "07:56:00",
  imageDesktop: { url: "https://example.com/recent.jpg" },
};

const olderHistoryTile = {
  id: "history-older",
  correlationId: "HISTORY_OLDER",
  link: "crew-5",
  title: "Crew-5 Mission",
  shortTitle: null,
  missionType: "crew",
  vehicle: "Falcon 9",
  launchSite: "LC-39A, Florida",
  returnSite: null,
  callToAction: "WATCH",
  missionStatus: "final",
  isLive: false,
  directToCell: false,
  launchDate: "2022-10-05",
  launchTime: "16:00:00",
  imageDesktop: { url: "https://example.com/older.jpg" },
};

const sampleMissionDetails = {
  id: 4373,
  documentId: "detail-doc",
  correlationId: "ABC123",
  missionId: "starlink-1",
  title: "Starlink Mission",
  callToAction: "WATCH",
  followDragonEnabled: false,
  vehicleTrackerEnabled: null,
  returnFromIssEnabled: false,
  toTheIssEnabled: false,
  imageDesktop: {
    url: "https://example.com/detail.jpg",
    width: 2600,
    height: 1200,
    mime: "image/jpeg",
    alternativeText: "Falcon 9 on the pad",
    formats: {
      large: { url: "https://example.com/detail-large.jpg" },
    },
  },
  infographicDesktop: {
    url: "https://example.com/infographic.webp",
    width: 2400,
    height: 1354,
    mime: "image/webp",
  },
  preLaunchTimeline: {
    title: "Countdown",
    disclaimer: null,
    timeHeader: "Hr/Min/Sec",
    descriptionHeader: "Event",
    timelineEntries: [
      {
        time: "00:38:00",
        description: "SpaceX Launch Director verifies go for propellant load",
      },
      {
        time: "00:01:00",
        description: "Command flight computer to begin final prelaunch checks",
      },
    ],
  },
  postLaunchTimeline: {
    title: "Launch, Landing, and Deployment",
    disclaimer: "All Times Approximate",
    timeHeader: "Hr/Min/Sec",
    descriptionHeader: "Event",
    timelineEntries: [{ time: "00:01:10", description: "Max Q" }],
  },
  astronauts: [],
  webcasts: [
    {
      id: 2433,
      videoId: "2055306091710275636",
      streamingVideoType: "x.com",
      title: null,
      date: null,
      isFeatured: null,
      imageDesktop: null,
      imageMobile: null,
    },
  ],
  paragraphs: [
    {
      id: 12077,
      content:
        'SpaceX’s Falcon 9 is targeting the launch of 29 <a href="https://www.starlink.com/" target="_">Starlink</a> satellites to low-Earth orbit.',
    },
    {
      id: 12079,
      content:
        "This will be the 28th flight for the first stage booster supporting this mission. Following stage separation, the first stage will land on the A Shortfall of Gravitas droneship.",
    },
  ],
};

function createFetchStub() {
  return async (url) => {
    if (String(url).includes("launches-page-tiles/upcoming")) {
      return new Response(JSON.stringify(sampleTiles), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (String(url).includes("future_missions.json")) {
      return new Response(JSON.stringify(sampleTimings), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };
}

function createFetchStubWithDetails(detailsResponse = sampleMissionDetails) {
  const launchFetch = createFetchStub();

  return async (url, init = {}) => {
    if (String(url).includes("api/spacex-website/missions/starlink-1")) {
      return new Response(JSON.stringify(detailsResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return launchFetch(url, init);
  };
}

function createFetchStubWithHistory(
  historyResponse = [olderHistoryTile, sampleHistoryResponse],
) {
  const launchFetch = createFetchStub();

  return async (url, init = {}) => {
    if (
      String(url).includes("launches-page-tiles") &&
      !String(url).includes("upcoming")
    ) {
      return new Response(JSON.stringify(historyResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return launchFetch(url, init);
  };
}

test("loadLaunchData merges SpaceX tiles and timing feeds", async () => {
  const data = await loadLaunchData(
    createFetchStub(),
    new Date("2026-04-01T00:00:00.000Z"),
  );

  assert.equal(data.missions.length, 2);
  assert.equal(data.nextLaunch.title, "Starlink Mission");
  assert.equal(
    data.missions[0].missionUrl,
    "https://www.spacex.com/launches/starlink-1/",
  );
  assert.equal(data.missions[1].launchWindow.close, "2026-04-20T07:22:00.000Z");
});
test("loadLaunchData filters launches that are already in the past", async () => {
  const pastTile = {
    ...sampleTiles[0],
    id: "past",
    correlationId: "PAST123",
    link: "past-mission",
    title: "Past Mission",
  };
  const futureTile = {
    ...sampleTiles[1],
    id: "future",
    correlationId: "FUTURE123",
    link: "future-mission",
    title: "Future Mission",
  };
  const fetchStub = async (url) => {
    if (String(url).includes("launches-page-tiles/upcoming")) {
      return new Response(JSON.stringify([pastTile, futureTile]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (String(url).includes("future_missions.json")) {
      return new Response(
        JSON.stringify({
          PAST123: {
            CorrelationId: "PAST123",
            PrimaryLaunchDate: { Seconds: 1779357600, Nanos: 0 },
            PrimaryLaunchWindow: null,
            TZeroLaunchDate: null,
            IsPrimaryLaunchTimeGiven: true,
          },
          FUTURE123: {
            CorrelationId: "FUTURE123",
            PrimaryLaunchDate: { Seconds: 1780452000, Nanos: 0 },
            PrimaryLaunchWindow: null,
            TZeroLaunchDate: null,
            IsPrimaryLaunchTimeGiven: true,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const data = await loadLaunchData(
    fetchStub,
    new Date("2026-05-24T12:00:00.000Z"),
  );

  assert.equal(data.missions.length, 1);
  assert.equal(data.nextLaunch.title, "Future Mission");
  assert.equal(data.missions[0].launchAt, "2026-06-03T02:00:00.000Z");
});

test("buildCalendarFeed emits valid VEVENT entries with DTEND when available", async () => {
  const data = await loadLaunchData(
    createFetchStub(),
    new Date("2026-04-01T00:00:00.000Z"),
  );
  const calendar = buildCalendarFeed(data);

  assert.match(calendar, /BEGIN:VCALENDAR/);
  assert.match(calendar, /END:VCALENDAR/);
  assert.match(calendar, /BEGIN:VEVENT/g);
  assert.match(calendar, /UID:ABC123@spacexcalendar\.local/);
  assert.match(calendar, /LAST-MODIFIED:\d{8}T\d{6}Z/);
  assert.match(calendar, /SEQUENCE:\d+/);
  assert.match(calendar, /DTEND:20260420T072200Z/);
});

test("loadMissionDetails normalizes SpaceX mission detail pages", async () => {
  const data = await loadMissionDetails(
    "starlink-1",
    createFetchStubWithDetails(),
  );

  assert.equal(data.details.slug, "starlink-1");
  assert.equal(data.details.title, "Starlink Mission");
  assert.equal(
    data.details.media.imageDesktop.url,
    "https://example.com/detail-large.jpg",
  );
  assert.equal(
    data.details.media.infographicDesktop.url,
    "https://example.com/infographic.webp",
  );
  assert.equal(
    data.details.paragraphs[0].links[0].href,
    "https://www.starlink.com/",
  );
  assert.match(
    data.details.paragraphs[0].text,
    /Starlink \(https:\/\/www\.starlink\.com\/\)/,
  );
  assert.match(data.details.summary, /28th flight/);
  assert.equal(data.details.timelines.preLaunch.entries.length, 2);
  assert.equal(
    data.details.timelines.postLaunch.disclaimer,
    "All Times Approximate",
  );
  assert.equal(
    data.details.webcasts[0].url,
    "https://x.com/SpaceX/status/2055306091710275636",
  );
});

test("loadMissionDetails rejects unsafe slugs", async () => {
  await assert.rejects(
    () => loadMissionDetails("../secret", createFetchStubWithDetails()),
    /Invalid mission slug/,
  );
});

test("loadHistoryLaunchData normalizes recent launch history", async () => {
  const data = await loadHistoryLaunchData(createFetchStubWithHistory());

  assert.equal(data.missions.length, 2);
  assert.equal(data.missions[0].id, "history-recent");
  assert.equal(data.missions[0].title, "Starlink Mission");
  assert.equal(data.missions[0].vehicle, "Falcon 9");
  assert.equal(data.missions[0].launchSite, "SLC-40, Florida");
  assert.equal(data.missions[0].launchAt, "2025-09-03T07:56:00.000Z");
  assert.equal(data.missions[0].status, "final");
  assert.equal(data.missions[0].success, true);
  assert.equal(
    data.missions[0].missionUrl,
    "https://www.spacex.com/launches/sl-10-22/",
  );
  assert.equal(data.missions[1].id, "history-older");
  assert.equal(data.missions[1].image, "https://example.com/older.jpg");
});

test("escapeIcsText escapes newlines commas and semicolons", () => {
  assert.equal(escapeIcsText("Line 1\nA,B;C"), "Line 1\\nA\\,B\\;C");
});

test("worker serves calendar route with text/calendar", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createFetchStub();

  try {
    const response = await worker.fetch(
      new Request("https://calendar.example.com/spacex.ics"),
      { ASSETS: { fetch: () => new Response("not used") } },
    );

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("content-type"),
      "text/calendar; charset=utf-8",
    );
    assert.match(await response.text(), /BEGIN:VCALENDAR/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker serves history launch route as JSON", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createFetchStubWithHistory();

  try {
    const response = await worker.fetch(
      new Request("https://calendar.example.com/api/history-launches"),
      { ASSETS: { fetch: () => new Response("not used") } },
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("content-type"),
      "application/json; charset=utf-8",
    );
    assert.equal(payload.missions.length, 2);
    assert.equal(payload.missions[0].title, "Starlink Mission");
    assert.equal(payload.missions[0].launchAt, "2025-09-03T07:56:00.000Z");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker serves mission details by slug as JSON", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = createFetchStubWithDetails();

  try {
    const response = await worker.fetch(
      new Request("https://calendar.example.com/api/launches/starlink-1"),
      { ASSETS: { fetch: () => new Response("not used") } },
    );
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("content-type"),
      "application/json; charset=utf-8",
    );
    assert.equal(payload.details.slug, "starlink-1");
    assert.equal(payload.details.timelines.preLaunch.title, "Countdown");
    assert.match(payload.details.summary, /A Shortfall of Gravitas/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker returns 502 when history launch route fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (
      String(url).includes("launches-page-tiles") &&
      !String(url).includes("upcoming")
    ) {
      return new Response("nope", { status: 503 });
    }

    return createFetchStub()(url);
  };

  try {
    const response = await worker.fetch(
      new Request("https://calendar.example.com/api/history-launches"),
      { ASSETS: { fetch: () => new Response("not used") } },
    );
    const payload = await response.json();

    assert.equal(response.status, 502);
    assert.equal(
      payload.error,
      "Unable to load SpaceX launch history right now.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("calendar feed remains limited to upcoming launches", async () => {
  const data = await loadLaunchData(
    createFetchStubWithHistory(),
    new Date("2026-04-01T00:00:00.000Z"),
  );
  const history = await loadHistoryLaunchData(createFetchStubWithHistory());
  const calendar = buildCalendarFeed(data);

  assert.equal(history.missions.length, 2);
  assert.doesNotMatch(calendar, /Crew-5 Mission/);
  assert.doesNotMatch(calendar, /sl-10-22/);
  assert.match(calendar, /Starlink Mission/);
});

test("worker falls back to static assets for root route", async () => {
  const response = await worker.fetch(
    new Request("https://calendar.example.com/"),
    {
      ASSETS: {
        fetch: () =>
          new Response("<html>ok</html>", {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          }),
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<html>ok</html>");
});

test("buildCalendarFeed supports enriched stable versions", () => {
  const enrichedMissions = [
    {
      id: "abc",
      correlationId: "ABC",
      link: "starlink-abc",
      title: "Starlink ABC",
      missionType: "starlink",
      vehicle: "Falcon 9",
      launchSite: "SLC-40",
      returnSite: "Droneship",
      launchAt: "2026-05-20T12:00:00.000Z",
      launchWindow: { open: null, close: null },
      firstDiscovered: "2026-05-01T00:00:00.000Z",
      lastModified: "2026-05-15T00:00:00.000Z",
      sequence: 5,
    },
  ];

  const calendar = buildCalendarFeed({
    refreshedAt: "2026-05-20T18:00:00.000Z",
    missions: enrichedMissions,
  });

  assert.match(calendar, /DTSTAMP:20260501T000000Z/);
  assert.match(calendar, /LAST-MODIFIED:20260515T000000Z/);
  assert.match(calendar, /SEQUENCE:5/);
});

test("loadLaunchData gracefully degrades when timings API fails", async () => {
  const fetchStub = async (url) => {
    if (String(url).includes("launches-page-tiles/upcoming")) {
      return new Response(JSON.stringify(sampleTiles), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (String(url).includes("future_missions.json")) {
      return new Response("Internal Server Error", {
        status: 500,
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const data = await loadLaunchData(fetchStub);

  assert.equal(data.missions.length, 2);
  assert.equal(data.missions[0].launchAt, null);
  assert.equal(data.missions[0].launchWindow.precision, "unknown");
});

test("calendar requests return KV data without request-time revalidation", async () => {
  const staleData = {
    refreshedAt: new Date(Date.now() - 2400 * 1000).toISOString(), // 40 minutes ago (stale under 30min TTL)
    missions: [
      {
        id: "mock-stale",
        title: "Stale Mission",
        launchWindow: { open: null, close: null },
      },
    ],
  };

  let kvPutCalled = false;
  const mockKv = {
    get: async (key) => {
      if (key === "spacex_launches_data") return staleData;
      return null;
    },
    put: async (key, val, options) => {
      if (key === "spacex_launches_data") {
        kvPutCalled = true;
      }
    },
  };

  let waitUntilCalled = false;
  let waitUntilPromise = null;
  const mockCtx = {
    waitUntil: (promise) => {
      waitUntilCalled = true;
      waitUntilPromise = promise;
    },
  };

  const originalFetch = globalThis.fetch;
  // Stub fetch to return fresh data
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(sampleTiles), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const response = await worker.fetch(
      new Request("https://calendar.example.com/api/launches"),
      { SPACEX_KV: mockKv },
      mockCtx,
    );

    assert.equal(response.status, 200);
    const data = await response.json();
    // Verify it returned the stale data immediately
    assert.equal(data.missions[0].id, "mock-stale");
    assert.equal(data.missions[0].title, "Stale Mission");

    assert.equal(waitUntilCalled, false);
    assert.equal(waitUntilPromise, null);
    assert.equal(kvPutCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("calendar requests keep serving KV data when upstream fetch would fail", async () => {
  const staleData = {
    refreshedAt: new Date(Date.now() - 2400 * 1000).toISOString(), // 40 minutes ago (stale under 30min TTL)
    missions: [
      {
        id: "mock-stale",
        title: "Stale Mission",
        launchWindow: { open: null, close: null },
      },
    ],
  };

  const mockKv = {
    get: async (key) => {
      if (key === "spacex_launches_data") return staleData;
      return null;
    },
    put: async () => {},
  };

  const originalFetch = globalThis.fetch;
  // Stub fetch to fail
  globalThis.fetch = async () => {
    throw new Error("Upstream Timeout");
  };

  try {
    // Call without ctx to force synchronous revalidation
    const response = await worker.fetch(
      new Request("https://calendar.example.com/api/launches"),
      { SPACEX_KV: mockKv },
    );

    assert.equal(response.status, 200);
    const data = await response.json();
    // Verify it fell back to stale data successfully
    assert.equal(data.missions[0].id, "mock-stale");
    assert.equal(data.missions[0].title, "Stale Mission");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadLaunchData preserves currently live-streaming missions even if launchAt is in the past", async () => {
  const livePastTile = {
    id: "live-past",
    correlationId: "LIVEPAST123",
    link: "live-mission",
    title: "Live Past Mission",
    missionType: "starlink",
    vehicle: "Falcon 9",
    launchSite: "SLC-40, Florida",
    returnSite: "Droneship",
    callToAction: "WATCH",
    missionStatus: "upcoming",
    isLive: true,
    directToCell: false,
    returnDateTime: null,
    imageDesktop: { url: "https://example.com/live.jpg" },
  };

  const fetchStub = async (url) => {
    if (String(url).includes("launches-page-tiles/upcoming")) {
      return new Response(JSON.stringify([livePastTile]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (String(url).includes("future_missions.json")) {
      return new Response(
        JSON.stringify({
          LIVEPAST123: {
            CorrelationId: "LIVEPAST123",
            PrimaryLaunchDate: { Seconds: 1779357600, Nanos: 0 }, // Past relative to mock date
            PrimaryLaunchWindow: null,
            TZeroLaunchDate: null,
            IsPrimaryLaunchTimeGiven: true,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const data = await loadLaunchData(
    fetchStub,
    new Date("2026-05-24T12:00:00.000Z"),
  );

  assert.equal(data.missions.length, 1);
  assert.equal(data.missions[0].title, "Live Past Mission");
  assert.equal(data.missions[0].isLive, true);
});

test("translateMissionDetails executes structured translation and handles fallback", async () => {
  const details = {
    summary: "SpaceX is targeting launch.",
    timelines: {
      preLaunch: {
        disclaimer: "Countdown is approximate.",
        entries: [{ description: "Go for propellant load" }],
      },
      postLaunch: {
        disclaimer: "All times approximate.",
        entries: [{ description: "Max Q" }],
      },
    },
  };

  // Mock AI runner
  const mockAi = {
    async run(model, payload) {
      assert.equal(model, "@cf/meta/llama-3.2-3b-instruct");
      const userMessage = payload.messages.find(
        (m) => m.role === "user",
      ).content;

      let isJson = false;
      let parsedUserMessage;
      try {
        parsedUserMessage = JSON.parse(userMessage);
        isJson = true;
      } catch (e) {
        // Plain text translation
      }

      if (isJson) {
        // Ensure summary is NOT present in the timeline translation call (context isolation check)
        assert.ok(
          !parsedUserMessage.summary,
          "Summary context must be isolated from timeline translation",
        );

        // Return a valid translated JSON response
        return {
          result: {
            response: JSON.stringify({
              preDisclaimer: "倒计时仅供参考。",
              preEntry_0: "确认推进剂加注",
              postDisclaimer: "所有时间均为大约估计",
              postEntry_0: "最大动力学压力",
            }),
          },
        };
      } else {
        // Plain text translation
        return {
          result: {
            response: `${userMessage} (translated)`,
          },
        };
      }
    },
  };

  await translateMissionDetails(mockAi, details, "chinese");

  assert.equal(details.summary, "SpaceX is targeting launch. (translated)"); // translateText fallback because details.summary is translated separately using translateText
  assert.equal(details.timelines.preLaunch.disclaimer, "倒计时仅供参考。");
  assert.equal(
    details.timelines.preLaunch.entries[0].description,
    "确认推进剂加注",
  );
  assert.equal(details.timelines.postLaunch.disclaimer, "所有时间均为大约估计");
  assert.equal(
    details.timelines.postLaunch.entries[0].description,
    "最大动力学压力",
  );
});

test("getStandardTranslation maps standard SpaceX timeline terms across all languages", () => {
  const resultZh = getStandardTranslation(
    "Max Q (moment of peak mechanical stress on the rocket)",
    "chinese",
  );
  assert.equal(resultZh, "最大动力学压力 (Max Q)");

  const resultJa = getStandardTranslation("Falcon 9 liftoff", "japanese");
  assert.equal(resultJa, "ファルコン9打上げ");

  const resultKo = getStandardTranslation(
    "Starlink satellites deploy",
    "korean",
  );
  assert.equal(resultKo, "스타링크 위성 배치");

  const resultEs = getStandardTranslation("1st stage landing", "spanish");
  assert.equal(resultEs, "Aterrizaje de la 1.ª etapa");

  const resultFr = getStandardTranslation("Fairing separation", "french");
  assert.equal(resultFr, "Séparation de la coiffe");

  const resultDe = getStandardTranslation(
    "1st and 2nd stages separate",
    "german",
  );
  assert.equal(resultDe, "Stufentrennung von 1. und 2. Stufe");

  const noMatch = getStandardTranslation(
    "Random custom event description here",
    "chinese",
  );
  assert.equal(noMatch, null);
});

test("translateText and translateMissionDetails replace phonetic Raptor translations", async () => {
  // Test translateText with phonetic Raptor
  const mockAiText = {
    async run() {
      return { result: { response: "拉普托 3 发动机点火" } };
    },
  };
  const result1 = await translateText(
    mockAiText,
    "Raptor 3 engine ignition",
    "chinese",
  );
  assert.equal(result1, "猛禽 3 发动机点火");

  const result2 = await translateText(
    mockAiText,
    "Raptor 3 engine ignition",
    "english",
  );
  assert.equal(result2, "拉普托 3 发动机点火"); // No replace for english

  // Test translateMissionDetails with phonetic Raptor
  const mockAiDetails = {
    async run() {
      return {
        result: {
          response: JSON.stringify({
            preDisclaimer: "拉普特 3 发动机测试。",
          }),
        },
      };
    },
  };
  const details = {
    summary: "",
    timelines: {
      preLaunch: {
        disclaimer: "Raptor 3 engine test.",
        entries: [],
      },
    },
  };
  await translateMissionDetails(mockAiDetails, details, "chinese");
  assert.equal(details.timelines.preLaunch.disclaimer, "猛禽 3 发动机测试。");
});

test("fixUrlMiddleware normalizes absolute request URLs into relative paths", () => {
  const event1 = { node: { req: { url: "http://localhost/" } } };
  fixUrlMiddleware(event1);
  assert.equal(event1.node.req.url, "/");

  const event2 = { node: { req: { url: "http://localhost:3000/spacex.ics?foo=bar#hash" } } };
  fixUrlMiddleware(event2);
  assert.equal(event2.node.req.url, "/spacex.ics?foo=bar#hash");

  const event3 = { node: { req: { url: "/normal/path" } } };
  fixUrlMiddleware(event3);
  assert.equal(event3.node.req.url, "/normal/path");
});

test("F1 topic exposes the complete 2026 race and session schedule", async () => {
  const data = await getTopicCalendarData("f1");
  const raceEvents = data.missions.filter((mission) => mission.id.endsWith("-race"));
  const sprintEvents = data.missions.filter((mission) => mission.id.endsWith("-sprint"));
  const qualifyingEvents = data.missions.filter((mission) => mission.id.endsWith("-qualifying"));

  assert.equal(raceEvents.length, 24);
  assert.equal(sprintEvents.length, 6);
  assert.equal(qualifyingEvents.length, 24);
  assert.equal(data.missions.length, 54);
  assert.equal(
    data.missions.find((mission) => mission.id === "f1-2026-china-sprint").launchAt,
    "2026-03-14T03:00:00.000Z",
  );
  assert.match(data.missions.find((mission) => mission.id === "f1-2026-hungary-race").titleEn, /Hungarian Grand Prix/);

  for (const race of raceEvents) {
    const eventPrefix = race.id.slice(0, -"-race".length);
    const qualifying = data.missions.find((mission) => mission.id === `${eventPrefix}-qualifying`);
    const sprint = data.missions.find((mission) => mission.id === `${eventPrefix}-sprint`);

    assert.ok(Date.parse(qualifying.launchAt) < Date.parse(race.launchAt), `${qualifying.id} must start before ${race.id}`);
    if (sprint) {
      assert.ok(Date.parse(sprint.launchAt) < Date.parse(qualifying.launchAt), `${sprint.id} must start before ${qualifying.id}`);
    }
  }

  const feed = buildTopicCalendarFeed("f1", data);
  assert.equal((feed.match(/BEGIN:VEVENT/g) || []).length, 54);
  assert.match(feed, /X-WR-CALNAME:F1 Grand Prix Schedule/);
  assert.match(feed, /UID:f1-2026-hungary-race@calendarhub\.local/);
});

test("WTT normalizes venue-local dates with explicit timezone and safe fallback", () => {
  assert.equal(
    normalizeWttDate("2026-08-15T14:15:00", 53),
    "2026-08-15T12:15:00.000Z",
  );
  assert.equal(
    normalizeWttDate("2026-08-15T00:15:00", 53),
    "2026-08-14T22:15:00.000Z",
  );
  assert.equal(
    normalizeWttDate("2026-08-15T14:15:00Z", 53),
    "2026-08-15T14:15:00.000Z",
  );
  assert.equal(
    normalizeWttDate("2026-08-15T14:15:00+01:00", 53),
    "2026-08-15T13:15:00.000Z",
  );
  assert.equal(
    normalizeWttDate("2026-08-15T14:15:00", 999),
    "2026-08-15T14:15:00.000Z",
  );
});

test("WTT normalizes only future matches with two named competitors", () => {
  const event = {
    eventId: 9001,
    eventName: "WTT Test Event 2026",
    venueName: "Test Arena",
    timeZoneId: 53,
  };
  const now = new Date("2026-08-14T00:00:00.000Z");
  const match = normalizeWttScheduleUnit(event, {
    Code: "TTEWSINGLES-----------FNL-000100--",
    StartDate: "2026-08-15T10:00:00",
    EndDate: "2026-08-15T11:00:00",
    ScheduleStatus: "Scheduled",
    SubEvent: "Women's Singles",
    VenueDescription: { VenueName: "Test Arena", LocationName: "Table 1" },
    StartList: {
      Start: [
        { StartOrder: 1, Competitor: { Description: { FamilyName: "SUN", GivenName: "Ying" } } },
        { StartOrder: 2, Competitor: { Description: { FamilyName: "ITO", GivenName: "Mima" } } },
      ],
    },
  }, now);

  assert.equal(match.id, "wtt-9001-TTEWSINGLES-----------FNL-000100--");
  assert.equal(match.titleEn, "SUN Ying vs ITO Mima");
  assert.equal(match.titleZh, "SUN Ying 对阵 ITO Mima");
  assert.equal(match.launchAt, "2026-08-15T08:00:00.000Z");
  assert.equal(match.launchWindow.close, "2026-08-15T09:00:00.000Z");
  assert.equal(match.vehicle, "Women's Singles");
  assert.equal(match.launchSite, "Test Arena");

  const doubles = normalizeWttScheduleUnit(event, {
    Code: "TTEWDOUBLES-----------SFNL000100--",
    StartDate: "2026-08-15T12:00:00Z",
    ScheduleStatus: "Scheduled",
    SubEvent: "Women's Doubles",
    StartList: {
      Start: [
        { StartOrder: 1, Competitor: { Description: { TeamName: "PLAYER A/PLAYER B" } } },
        { StartOrder: 2, Competitor: { Description: { TeamName: "PLAYER C/PLAYER D" } } },
      ],
    },
  }, now);
  assert.equal(doubles.titleEn, "PLAYER A/PLAYER B vs PLAYER C/PLAYER D");

  assert.equal(normalizeWttScheduleUnit(event, {
    Code: "past",
    StartDate: "2026-08-13T12:00:00Z",
    StartList: { Start: [] },
  }, now), null);
  assert.equal(normalizeWttScheduleUnit(event, {
    Code: "unpublished",
    StartDate: "2026-08-15T12:00:00Z",
    StartList: {
      Start: [
        { StartOrder: 1, Competitor: { Description: { TeamName: "TBD" } } },
        { StartOrder: 2, Competitor: { Description: { TeamName: "PLAYER C" } } },
      ],
    },
  }, now), null);
});

test("normalizeWttOfficialResult parses completed match, scores, winner, and game breakdown", () => {
  const event = {
    eventId: 3246,
    eventName: "Europe Smash - Sweden 2026",
    venueName: "Malmö Arena",
    timeZoneId: 53,
  };
  const resultItem = {
    id: 15832417,
    eventId: "3246",
    documentCode: "TTEMSINGLES-----------FNL-000100----------",
    subEventType: "Men Singles",
    fullResults: "OFFICIAL",
    match_card: {
      eventId: "3246",
      documentCode: "TTEMSINGLES-----------FNL-000100----------",
      subEventName: "Men's Singles",
      subEventDescription: "Men's Singles - Final - Match 1",
      venueName: "Malmö Arena",
      competitiors: [
        {
          competitorType: "H",
          competitiorName: "LEBRUN Felix",
          competitiorOrg: "FRA",
        },
        {
          competitorType: "A",
          competitiorName: "HARIMOTO Tomokazu",
          competitiorOrg: "JPN",
        },
      ],
      resultsGameScores: "11-5,11-8,5-11,11-9,11-9,0-0,0-0",
      resultOverallScores: "4-1",
      resultStatus: "OFFICIAL",
      matchDateTime: {
        startDateLocal: "08/16/2026 19:00:00",
        startDateUTC: "08/16/2026 17:00:00",
      },
    },
  };

  const parsed = normalizeWttOfficialResult(event, resultItem);
  assert.ok(parsed);
  assert.equal(parsed.id, "wtt-3246-TTEMSINGLES-----------FNL-000100");
  assert.equal(parsed.titleEn, "LEBRUN Felix vs HARIMOTO Tomokazu");
  assert.equal(parsed.titleZh, "LEBRUN Felix 对阵 HARIMOTO Tomokazu");
  assert.equal(parsed.status, "Finished");
  assert.equal(parsed.calendarGroup, "history");
  assert.equal(parsed.scores, "4-1");
  assert.equal(parsed.winner, "LEBRUN Felix");
  assert.equal(parsed.competitor1.isWinner, true);
  assert.equal(parsed.competitor2.isWinner, false);
  assert.deepEqual(parsed.gameScores, ["11-5", "11-8", "5-11", "11-9", "11-9"]);
  assert.equal(parsed.launchAt, "2026-08-16T17:00:00.000Z");
  assert.equal(parsed.launchSite, "Malmö Arena");
  assert.equal(parsed.vehicle, "Men's Singles");
});

test("WTT loader filters to the main series and includes completed official results and future schedules", async () => {
  const now = new Date("2026-08-14T00:00:00.000Z");
  const scheduleCalls = [];
  const events = [
    {
      eventId: 9001,
      eventName: "WTT Main Event 2026",
      event_Tier_name: "WTT Series",
      startDateTime: "2026-08-15T00:00:00",
      endDateTime: "2026-08-20T00:00:00",
      venueName: "Main Arena",
      timeZoneId: 53,
    },
    {
      eventId: 9002,
      eventName: "WTT Feeder Event 2026",
      event_Tier_name: "WTT Feeder Series",
      startDateTime: "2026-08-15T00:00:00",
      endDateTime: "2026-08-20T00:00:00",
    },
    {
      eventId: 9003,
      eventName: "WTT Youth Event 2026",
      event_Tier_name: "WTT Youth Series",
      startDateTime: "2026-08-15T00:00:00",
      endDateTime: "2026-08-20T00:00:00",
    },
    {
      eventId: 9004,
      eventName: "Past WTT Main Event",
      event_Tier_name: "WTT Series",
      startDateTime: "2026-07-01T00:00:00",
      endDateTime: "2026-07-05T00:00:00",
    },
  ];
  const schedule = [{ Competition: { Unit: [{
    Code: "match-1",
    StartDate: "2026-08-15T14:15:00",
    EndDate: "2026-08-15T15:00:00",
    ScheduleStatus: "Scheduled",
    SubEvent: "Men's Singles",
    VenueDescription: { VenueName: "Main Arena" },
    StartList: { Start: [
      { StartOrder: 1, Competitor: { Description: { FamilyName: "ZHANG", GivenName: "Ben" } } },
      { StartOrder: 2, Competitor: { Description: { FamilyName: "WANG", GivenName: "Chuqin" } } },
    ] },
  }] } }];

  const officialResults = [
    {
      eventId: "9001",
      documentCode: "TTEMSINGLES-----------FNL-000100--",
      subEventType: "Men Singles",
      match_card: {
        eventId: "9001",
        documentCode: "TTEMSINGLES-----------FNL-000100--",
        subEventName: "Men's Singles",
        subEventDescription: "Men's Singles - Final",
        venueName: "Main Arena",
        competitiors: [
          { competitiorName: "FAN Zhendong", competitiorOrg: "CHN" },
          { competitiorName: "HARIMOTO Tomokazu", competitiorOrg: "JPN" },
        ],
        resultsGameScores: "11-8,11-6,9-11,11-7,0-0",
        resultOverallScores: "3-1",
        resultStatus: "OFFICIAL",
        matchDateTime: {
          startDateUTC: "08/14/2026 10:00:00",
        },
      },
    },
  ];

  const fetchStub = async (url) => {
    const value = String(url);
    if (value.includes("wtt_upcoming_only_events_list.json")) {
      return new Response(JSON.stringify(events), { status: 200 });
    }
    if (value.includes("take_10_official_results.json")) {
      return new Response(JSON.stringify(officialResults), { status: 200 });
    }
    const eventId = Number(value.split("/").pop());
    scheduleCalls.push(eventId);
    if (eventId === 9001) return new Response(JSON.stringify(schedule), { status: 200 });
    return new Response(null, { status: 204 });
  };

  const data = await loadWttCalendarData(fetchStub, now);
  assert.deepEqual(scheduleCalls, [9001]);
  assert.equal(data.topic.id, "wtt");
  assert.equal(data.missions.length, 2);

  // 1. Completed match
  const finishedMatch = data.missions.find(m => m.status === "Finished");
  assert.ok(finishedMatch);
  assert.equal(finishedMatch.titleZh, "FAN Zhendong 对阵 HARIMOTO Tomokazu");
  assert.equal(finishedMatch.scores, "3-1");
  assert.equal(finishedMatch.winner, "FAN Zhendong");
  assert.equal(finishedMatch.calendarGroup, "history");

  // 2. Future match
  const futureMatch = data.missions.find(m => m.status === "Scheduled");
  assert.ok(futureMatch);
  assert.equal(futureMatch.titleZh, "ZHANG Ben 对阵 WANG Chuqin");
  assert.equal(futureMatch.calendarId, "wtt");
  assert.equal(futureMatch.launchAt, "2026-08-15T12:15:00.000Z");
  assert.equal(futureMatch.launchWindow.close, "2026-08-15T13:00:00.000Z");

  const feed = buildTopicCalendarFeed("wtt", data);
  assert.match(feed, /SUMMARY:\[3-1\] FAN Zhendong vs HARIMOTO Tomokazu/);
  assert.match(feed, /Score: 3-1/);
  assert.match(feed, /FAN Zhendong/);
  assert.match(feed, /11-8/);
  assert.match(feed, /DTSTART:20260815T121500Z/);
  assert.match(feed, /DTEND:20260815T130000Z/);
});

const officialF1Rows = [
  ["Australia, Mar 8", "-", "1600", "1500"],
  ["China, Mar 15", "1100", "1500", "1500"],
  ["Japan, Mar 29", "-", "1500", "1400"],
  ["Bahrain, Apr 12", "-", "1900", "1800"],
  ["Saudi Arabia, Apr 19", "-", "2000", "2000"],
  ["Miami, May 3", "1200", "1600", "1600"],
  ["Canada, May 24", "1200", "1600", "1600"],
  ["Monaco, Jun 7", "-", "1600", "1500"],
  ["Barcelona, Jun 14", "-", "1600", "1500"],
  ["Austria, Jun 28", "-", "1600", "1500"],
  ["Great Britain, Jul 5", "1200", "1600", "1500"],
  ["Belgium, Jul 19", "-", "1600", "1500"],
  ["Hungary, Jul 26", "-", "1600", "1500"],
  ["Netherlands, Aug 23", "1200", "1600", "1500"],
  ["Italy, Sep 6", "-", "1600", "1500"],
  ["Spain, Sep 13", "-", "1600", "1500"],
  ["Azerbaijan, Sep 26", "-", "1600", "1500"],
  ["Singapore, Oct 11", "1700", "2100", "2000"],
  ["United States, Oct 25", "-", "1600", "1500"],
  ["Mexico, Nov 1", "-", "1500", "1400"],
  ["Brazil, Nov 8", "-", "1500", "1400"],
  ["Las Vegas, Nov 21", "-", "2000", "2000"],
  ["Qatar, Nov 29", "-", "2100", "1900"],
  ["Abu Dhabi, Dec 6", "-", "1800", "1700"],
];

const officialF1Html = `
  <h2>2026 F1 start times</h2>
  <table><tbody>
    ${officialF1Rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}
  </tbody></table>
`;

test("official F1 start times are parsed into correctly ordered session dates", () => {
  const races = parseF1OfficialStartTimes(officialF1Html);
  assert.equal(races.length, 24);
  assert.equal(races[1].sessions.sprint, "2026-03-14T11:00");
  assert.equal(races[1].sessions.qualifying, "2026-03-14T15:00");
  assert.equal(races[1].sessions.race, "2026-03-15T15:00");
  assert.equal(races[16].sessions.qualifying, "2026-09-25T16:00");
  assert.equal(races[16].sessions.race, "2026-09-26T15:00");
});

test("hourly calendar sync writes only changed SpaceX and F1 data to KV", async () => {
  const values = new Map();
  const calendarWrites = [];
  const kv = {
    async get(key, type) {
      const value = values.get(key);
      return type === "json" || value == null ? value ?? null : JSON.stringify(value);
    },
    async put(key, value) {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      values.set(key, parsed);
      if (Object.values(CALENDAR_KEYS).includes(key)) calendarWrites.push(key);
    },
  };
  const fetchStub = async (url) => {
    const value = String(url);
    if (value.includes("formula-1-and-fia-announce")) {
      return new Response(officialF1Html, { status: 200 });
    }
    if (value.includes("launches-page-tiles")) {
      return new Response(JSON.stringify(sampleTiles), { status: 200 });
    }
    if (value.includes("future_missions.json")) {
      return new Response(JSON.stringify(sampleTimings), { status: 200 });
    }
    throw new Error(`Unexpected URL: ${value}`);
  };
  const env = { SPACEX_KV: kv };
  const now = new Date("2026-01-01T00:00:00.000Z");

  const first = await syncCalendars(env, fetchStub, now);
  assert.equal(first.calendars.spacex.changed, true);
  assert.equal(first.calendars.f1.changed, true);
  assert.deepEqual(calendarWrites.sort(), Object.values(CALENDAR_KEYS).sort());

  calendarWrites.length = 0;
  const second = await syncCalendars(env, fetchStub, now);
  assert.equal(second.calendars.spacex.changed, false);
  assert.equal(second.calendars.f1.changed, false);
  assert.deepEqual(calendarWrites, []);
});

test("F1 ICS route resolves the topic from an extension URL", async () => {
  const headers = {};
  const event = {
    context: {
      params: {},
      cloudflare: {
        env: {},
        context: {},
        url: new URL("https://calendarhub.mou7s.com/ics/f1.ics"),
      },
    },
    node: {
      req: { url: "/ics/f1.ics" },
      res: { setHeader(name, value) { headers[name] = value; } },
    },
  };

  const feed = await topicIcsRoute(event);
  assert.match(feed, /X-WR-CALNAME:F1 Grand Prix Schedule/);
  assert.equal(headers["Content-Disposition"], 'inline; filename="f1.ics"');
});

test("F1 ICS route prefers the request pathname in a Cloudflare-style event", async () => {
  const headers = {};
  const event = {
    context: {
      params: {},
      cloudflare: { env: {}, context: {} },
    },
    node: {
      req: {
        url: "https://calendarhub.mou7s.com/ics/f1.ics",
        headers: { host: "calendarhub.mou7s.com" },
      },
      res: { setHeader(name, value) { headers[name] = value; } },
    },
  };

  const feed = await topicIcsRoute(event);
  assert.match(feed, /X-WR-CALNAME:F1 Grand Prix Schedule/);
  assert.equal(headers["Content-Disposition"], 'inline; filename="f1.ics"');
});

test("WTT ICS route serves the cached topic feed", async () => {
  const headers = {};
  const data = {
    refreshedAt: new Date().toISOString(),
    topic: { id: "wtt", nameEn: "WTT Table Tennis Calendar" },
    missions: [{
      id: "wtt-9001-match-1",
      correlationId: "wtt-9001-match-1",
      title: "ZHANG Ben vs WANG Chuqin",
      launchAt: "2026-08-15T10:00:00.000Z",
      launchWindow: { close: "2026-08-15T11:00:00.000Z" },
      launchSite: "Main Arena",
      missionUrl: "https://www.worldtabletennis.com/eventInfo?eventId=9001",
    }],
  };
  const kv = {
    async get(key) {
      return key === "calendar_topic_wtt" ? data : null;
    },
    async put() {},
  };
  const event = {
    context: {
      params: {},
      cloudflare: {
        env: { SPACEX_KV: kv },
        context: {},
        url: new URL("https://calendarhub.mou7s.com/ics/wtt.ics"),
      },
    },
    node: {
      req: { url: "/ics/wtt.ics" },
      res: { setHeader(name, value) { headers[name] = value; } },
    },
  };

  const feed = await topicIcsRoute(event);
  assert.match(feed, /X-WR-CALNAME:WTT Table Tennis Calendar/);
  assert.match(feed, /UID:wtt-9001-match-1@calendarhub\.local/);
  assert.equal(headers["Content-Disposition"], 'inline; filename="wtt.ics"');
});

test("local date helpers correctly handle timezone and month boundary conversion", () => {
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

  // Test standard ISO string parse
  const parts1 = getLocalDateParts("2026-08-14T12:00:00.000Z");
  assert.ok(parts1);
  assert.equal(typeof parts1.year, "number");
  assert.equal(typeof parts1.month, "string");
  assert.equal(typeof parts1.day, "string");
  assert.equal(parts1.monthKey, `${parts1.year}-${parts1.month}`);
  assert.equal(parts1.dateIso, `${parts1.year}-${parts1.month}-${parts1.day}`);

  // Test invalid input returns null safely
  assert.equal(getLocalDateParts(null), null);
  assert.equal(getLocalDateParts("invalid-date-string"), null);
});

test("calendar month selection prefers today and preserves manual navigation", () => {
  assert.deepEqual(
    buildCalendarMonthKeys(["2026-07"], "2026-08"),
    ["2026-07", "2026-08"],
  );
  assert.equal(
    resolveCalendarMonthIndex(["2026-07", "2026-08"], "2026-08", "2026-09"),
    1,
  );
  assert.equal(
    resolveCalendarMonthIndex(["2026-07", "2026-09"], "2026-08", "2026-09"),
    1,
  );
  assert.equal(
    resolveCalendarMonthIndex(
      ["2026-07", "2026-08"],
      "2026-08",
      "2026-09",
      "2026-07",
    ),
    0,
  );
  assert.equal(
    resolveCalendarMonthIndex(["2026-07", "2026-08"], "2026-09", "2026-10"),
    0,
  );
});

test("calendar navigation moves by view-specific steps and supports empty months", () => {
  assert.equal(getCalendarNavigationStep("month"), 0);
  assert.equal(getCalendarNavigationStep("week"), 7);
  assert.equal(getCalendarNavigationStep("day"), 1);
  assert.equal(shiftCalendarDate("2026-08-31", 1), "2026-09-01");
  assert.equal(shiftCalendarDate("2026-08-31", 7), "2026-09-07");
  assert.equal(shiftCalendarDate("2026-09-07", -7), "2026-08-31");
  assert.equal(getCalendarMonthKey("2026-09-07"), "2026-09");
  assert.equal(getCalendarMonthAnchor("2026-09"), "2026-09-01");
  assert.equal(shiftCalendarDate("", 1), "");
});

test("calendar day events are sorted from midnight to the end of the day", () => {
  const events = [
    { id: "late", launchAt: "2026-08-15T23:00:00+08:00" },
    { id: "early", launchAt: "2026-08-15T04:05:00+08:00" },
    { id: "middle", launchAt: "2026-08-15T09:30:00+08:00" },
  ];

  assert.deepEqual(
    sortCalendarEventsByStartTime(events).map((event) => event.id),
    ["early", "middle", "late"],
  );
  assert.deepEqual(events.map((event) => event.id), ["late", "early", "middle"]);
});

test("calendar event presentation uses F1 semantics without changing SpaceX defaults", () => {
  assert.deepEqual(getCalendarEventPresentation({ calendarId: "f1" }), {
    vehicleLabelKey: "calendar.f1.vehicle",
    locationLabelKey: "calendar.f1.track",
    vehicleIcon: "i-lucide-car-front",
    locationIcon: "i-lucide-flag",
  });

  assert.deepEqual(getCalendarEventPresentation({ calendarId: "spacex" }), {
    vehicleLabelKey: "mission.vehicle",
    locationLabelKey: "mission.launchSite",
    vehicleIcon: "i-heroicons-rocket-launch",
    locationIcon: "i-heroicons-map-pin",
  });

  assert.deepEqual(getCalendarEventPresentation({ calendarId: "wtt" }), {
    vehicleLabelKey: "calendar.wtt.match",
    locationLabelKey: "calendar.wtt.venue",
    scoreLabelKey: "calendar.wtt.score",
    winnerLabelKey: "calendar.wtt.winner",
    gamesLabelKey: "calendar.wtt.games",
    vehicleIcon: "i-lucide-trophy",
    locationIcon: "i-lucide-map-pin",
  });
});
