import { defineEventHandler } from 'h3'

/**
 * 修复 HTTP 代理或特殊客户端发送的全路径 URL (如 http://localhost/ 或 http://localhost:3000/)
 * 将其自动提取并规范化为相对路径 (如 /)，防止 H3 路由器抛出 404 "Cannot find any route matching http://localhost/."
 */
export default defineEventHandler((event) => {
  if (event.node?.req?.url) {
    const rawUrl = event.node.req.url;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      try {
        const parsed = new URL(rawUrl);
        const cleanPath = parsed.pathname + parsed.search + parsed.hash;
        event.node.req.url = cleanPath;
        event._path = cleanPath;
      } catch (e) {
        // 静默忽略无法解析的格式
      }
    }
  }
})
