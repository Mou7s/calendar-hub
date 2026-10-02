import { streamingServerCompat, streamingCookieCompat } from './build/ssr-streaming-compat'
import { themeColorsBootstrapScript } from './app/utils/theme-colors'

// 模板 nuxt-ui-templates/calendar 基底 + 本站能力合并：
// i18n（7 语言）、NuxtHub KV、Cloudflare Workers 预设、定时同步、PWA 头。
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxthub/core',
    '@nuxtjs/i18n'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  ui: {
    experimental: {
      componentDetection: true
    }
  },

  experimental: {
    viewTransition: true,
    watcher: 'builder',
    ssrStreaming: true,
    // Current i18n/fonts plugins still rely on Vite config/server hooks.
    // Keep their supported pipeline while retaining other Nuxt 5 defaults.
    viteEnvironmentApi: false
  },

  compatibilityDate: '2026-06-30',

  // `--font-sans` leads with `-apple-system` so Apple platforms use SF Pro, and
  // @nuxt/fonts only resolves the first family in a stack, so Inter is declared
  // here to get its `@font-face` emitted for everyone else
  fonts: {
    families: [{ name: 'Inter', provider: 'google', global: true }]
  },

  // Icons outside the client bundle are fetched from the server on first
  // render. Scanning inlines every icon the app references, so it ships
  // with the bundle and the fetch never happens
  icon: {
    clientBundle: {
      scan: true
    }
  },

  // 全局 Head 配置：主题色与日历 favicon
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [
        { name: 'theme-color', content: '#080d1c', media: '(prefers-color-scheme: dark)' },
        { name: 'theme-color', content: '#f2f2f7', media: '(prefers-color-scheme: light)' }
      ],
      script: [{
        // 首帧前恢复用户选的主题色（主色 / 中性色），见 app/utils/theme-colors.js
        innerHTML: themeColorsBootstrapScript()
      }]
    }
  },

  // 国际化 (i18n) 多语言的详细配置
  i18n: {
    compilation: {
      strictMessage: false,
      escapeHtml: false
    },
    strategy: 'no_prefix',
    defaultLocale: 'en',
    langDir: 'locales',
    locales: [
      { code: 'zh-CN', file: 'zh-CN.json', name: '简体中文' },
      { code: 'en', file: 'en.json', name: 'English' },
      { code: 'ja', file: 'ja.json', name: '日本語' },
      { code: 'ko', file: 'ko.json', name: '한국어' },
      { code: 'es', file: 'es.json', name: 'Español' },
      { code: 'fr', file: 'fr.json', name: 'Français' },
      { code: 'de', file: 'de.json', name: 'Deutsch' }
    ]
  },

  // Nuxt Hub 平台特性配置：开启 KV 数据库缓存支持
  hub: {
    kv: true
  },

  future: {
    compatibilityVersion: 5
  },

  // Nitro 服务器引擎：以 Cloudflare Workers Module Worker 形式部署
  nitro: {
    preset: 'cloudflare_module',
    rollupConfig: { plugins: [streamingServerCompat()] },
    experimental: {
      tasks: true
    },
    scheduledTasks: {
      '7 * * * *': ['calendar:sync']
    }
  },

  // Only split browser dependencies; preserve the Workers server pipeline.
  hooks: {
    'vite:extendConfig'(config, { isClient }) {
      if (!isClient) return
      if (!config.build) return
      config.build.rolldownOptions ||= {}
      config.build.rolldownOptions.output = {
        ...config.build.rolldownOptions.output,
        codeSplitting: {
          groups: [
            { name: 'vue', test: /node_modules[\\/](?:@vue[\\/]|vue[\\/]|vue-router[\\/])/ },
            { name: 'ui-primitives', test: /node_modules[\\/](?:reka-ui|@floating-ui|@internationalized|tailwind-variants|tailwind-merge|vaul-vue)[\\/]/ }
          ]
        }
      }
    }
  },

  // Vite 构建与优化配置
  vite: {
    plugins: [
      streamingCookieCompat(),
      {
        name: 'fix-absolute-url-middleware',
        configureServer(server) {
          server.middlewares.use((req: any, res: any, next: any) => {
            if (req.url && (req.url.startsWith('http://') || req.url.startsWith('https://'))) {
              try {
                const parsed = new URL(req.url)
                req.url = parsed.pathname + parsed.search + parsed.hash
              } catch (e) {
                // ignore
              }
            }
            next()
          })
        }
      }
    ],
    optimizeDeps: {
      include: ['@vue/devtools-core', '@vue/devtools-kit']
    }
  }
})
