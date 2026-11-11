const SCANNER_PREFIX_RE = /^\/(?:\.env|\.git|\.aws|\.vscode|\.svn|wp-admin|wp-login|wp-includes|wp-content|phpmyadmin)(?:\/|$|\.)/i
const SCANNER_SUFFIX_RE = /\.(?:php|php\d|phtml|bak|sql|env|ini|asp|aspx|jsp|cgi|dll)(?:$|\.)/i
const SCANNER_EXACT_OR_TAIL_RE = /(?:^|\/)(?:web\.config|composer\.json|composer\.lock|secrets\.yml|laravel\.log|mail\.json|mail-credentials\.env|\.gitattributes|\.htaccess)$/i

// Malicious vulnerability scanners and non-search bulk scrapers with zero referral value
const BLOCKED_UA_RE = /(?:TLM-Audit-Scanner|sqlmap|nikto|nuclei|masscan|zgrab|dirbuster|gobuster|acunetix|nessus|ElevenlabsCrawler|Bytespider)/i

// General search, social preview, and AI search crawlers (guided rather than blocked)
const CRAWLER_UA_RE = /(?:bot|crawler|spider|slurp|archiver|facebookexternalhit|ia_archiver)/i

const MONTH_ROUTE_RE = /^\/month\/(\d{4})-\d{2}-\d{2}\/?$/

/**
 * Classify incoming requests to:
 * 1. Short-circuit vulnerability probes (404) before Vue SSR / KV reads.
 * 2. Reject abusive scanners / non-search scrapers (403) while still allowing /robots.txt.
 * 3. Guide benign crawlers out of infinite calendar pagination (/day/*, /week/*, distant years) back to `/`.
 */
export function evaluateCrawlerGuard(pathname, userAgent = '', currentYear = new Date().getUTCFullYear()) {
  const path = String(pathname || '/').split('?')[0] || '/'
  const ua = String(userAgent || '')

  if (path === '/robots.txt' || path === '/llms.txt' || path === '/sitemap.xml') {
    return { action: 'allow' }
  }

  if (
    SCANNER_PREFIX_RE.test(path) ||
    SCANNER_SUFFIX_RE.test(path) ||
    SCANNER_EXACT_OR_TAIL_RE.test(path) ||
    /\/\.env(?:\.|$)/i.test(path)
  ) {
    return { action: 'not-found' }
  }

  if (BLOCKED_UA_RE.test(ua)) {
    return { action: 'forbidden' }
  }

  if (CRAWLER_UA_RE.test(ua)) {
    if (path.startsWith('/day/') || path.startsWith('/week/')) {
      return { action: 'redirect-home' }
    }
    const monthMatch = path.match(MONTH_ROUTE_RE)
    if (monthMatch) {
      const year = Number(monthMatch[1])
      if (Number.isFinite(year) && (year < currentYear - 1 || year > currentYear + 1)) {
        return { action: 'redirect-home' }
      }
    }
  }

  return { action: 'allow' }
}
