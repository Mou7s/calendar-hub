import { defineNitroPlugin } from 'nitropack/runtime'

/**
 * Nitro 核心插件：在所有请求进入 Nitro/H3 路由匹配器之前触发 (request hook)
 * 提取并规范化绝对 Request URL (如 http://localhost/ 或 http://localhost:3000/) 为相对路径 (如 /)
 * 解决底层 H3 Router 抛出 "Cannot find any route matching http://localhost/." 的 404 异常
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if (event.node?.req?.url) {
      const rawUrl = event.node.req.url;
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        try {
          const parsed = new URL(rawUrl);
          const cleanPath = parsed.pathname + parsed.search + parsed.hash;
          event.node.req.url = cleanPath;
          event._path = cleanPath;
        } catch (e) {
          // 静默忽略无法解析的 URL 格式
        }
      }
    }
  });
});
