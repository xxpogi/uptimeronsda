// Security utilities - SSRF protection, input sanitization
// Uses global WHATWG URL API (no deprecated url.parse)

// Private IP ranges to block (SSRF protection)
const BLOCKED_IP_PATTERNS = [
  /^127\./,                          // Localhost
  /^10\./,                           // Private Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // Private Class B
  /^192\.168\./,                     // Private Class C
  /^169\.254\./,                     // Link-local
  /^0\./,                            // Current network
  /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-9])\./,  // Carrier-grade NAT
  /^198\.1[89]\./,                   // Benchmark testing
  /^::1$/,                           // IPv6 localhost
  /^fc00:/i,                         // IPv6 private
  /^fe80:/i,                         // IPv6 link-local
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  'metadata.google.internal',
  'metadata',
  'kubernetes.default',
];

// Cloud metadata endpoints
const BLOCKED_PATHS = [
  '/latest/meta-data',
  '/metadata/v1',
  '/computeMetadata',
  '/opc/v1',
];

export function isUrlSafe(urlString) {
  try {
    const url = new URL(urlString);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { safe: false, reason: 'Only HTTP/HTTPS protocols allowed' };
    }

    // Block localhost and private hostnames
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.some(h => hostname === h || hostname.endsWith('.' + h))) {
      return { safe: false, reason: 'Localhost and internal hostnames not allowed' };
    }

    // Block private IPs
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: 'Private IP addresses not allowed' };
      }
    }

    // Block metadata paths
    const path = url.pathname.toLowerCase();
    if (BLOCKED_PATHS.some(p => path.startsWith(p))) {
      return { safe: false, reason: 'Cloud metadata endpoints not allowed' };
    }

    // Block URLs with credentials
    if (url.username || url.password) {
      return { safe: false, reason: 'URLs with credentials not allowed' };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }
}

// CSV injection protection
export function sanitizeForCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Prefix with single quote if starts with formula characters
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  // Escape quotes and wrap in quotes if contains comma or newline
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Sanitize label to prevent XSS
export function sanitizeLabel(label) {
  if (!label || typeof label !== 'string') return '';
  return label
    .trim()
    .slice(0, 100)
    .replace(/[<>]/g, '');
}

// Validate UUID format
export function isValidUUID(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// Rate limiting helper
const requestCounts = new Map();
const WINDOW_MS = 60000;
const MAX_REQUESTS = 100;

export function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  
  if (!requestCounts.has(key)) {
    requestCounts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  
  const record = requestCounts.get(key);
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + WINDOW_MS;
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  
  record.count++;
  if (record.count > MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: MAX_REQUESTS - record.count };
}
