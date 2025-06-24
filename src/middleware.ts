import { NextRequest, NextResponse } from 'next/server';

// Types for extended NextRequest properties (for platforms like Vercel)
interface ExtendedNextRequest extends NextRequest {
  ip?: string;
  geo?: {
    country?: string;
    region?: string;
    city?: string;
    latitude?: string;
    longitude?: string;
  };
}

// Helper function to safely get IP address
function getClientIP(request: NextRequest): string {
  // Check for x-forwarded-for header first (most common)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Check for x-real-ip header
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // Check for CF-Connecting-IP (Cloudflare)
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP.trim();
  }

  // Check for x-client-ip
  const clientIP = request.headers.get('x-client-ip');
  if (clientIP) {
    return clientIP.trim();
  }

  // Fallback to ip property if available (Vercel/Netlify)
  const extendedRequest = request as ExtendedNextRequest;
  if (extendedRequest.ip) {
    return extendedRequest.ip;
  }

  // Final fallback
  return 'anonymous';
}

// Helper function to safely get geo information
function getGeoInfo(request: NextRequest): { country: string; region?: string; city?: string } {
  const extendedRequest = request as ExtendedNextRequest;

  // Try to get from geo property (Vercel Edge Functions)
  if (extendedRequest.geo?.country) {
    return {
      country: extendedRequest.geo.country,
      region: extendedRequest.geo.region,
      city: extendedRequest.geo.city,
    };
  }

  // Try to get from CF headers (Cloudflare)
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry && cfCountry !== 'XX') {
    return {
      country: cfCountry,
      region: request.headers.get('cf-region-code') || undefined,
      city: request.headers.get('cf-ipcity') || undefined,
    };
  }

  // Try to get from other common headers
  const country = request.headers.get('x-country-code') ||
    request.headers.get('x-geoip-country') ||
    'unknown';

  return { country };
}

// Helper function to detect user agent info
function getUserAgentInfo(userAgent: string) {
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  // Browser detection
  let browser = 'unknown';
  if (userAgent.includes('Chrome')) browser = 'chrome';
  else if (userAgent.includes('Firefox')) browser = 'firefox';
  else if (userAgent.includes('Safari')) browser = 'safari';
  else if (userAgent.includes('Edge')) browser = 'edge';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isBot,
    browser,
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get language from cookies or headers
  const language = request.cookies.get('language')?.value ||
    request.headers.get('accept-language')?.split(',')[0]?.split('-')[0] ||
    'en';

  // Create response
  const response = NextResponse.next();

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');

  // Enhanced Content Security Policy
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' http://localhost:4000 https: wss: ws:", // ✅ updated
    "media-src 'self' data: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspHeader);

  // Get client info safely
  const clientIP = getClientIP(request);
  const geoInfo = getGeoInfo(request);
  const userAgent = request.headers.get('user-agent') || '';
  const userAgentInfo = getUserAgentInfo(userAgent);

  // Add client info headers
  response.headers.set('X-Client-IP', clientIP);
  response.headers.set('X-User-Country', geoInfo.country);
  response.headers.set('X-User-Language', language);
  response.headers.set('X-Is-Mobile', userAgentInfo.isMobile.toString());
  response.headers.set('X-Is-Desktop', userAgentInfo.isDesktop.toString());
  response.headers.set('X-User-Browser', userAgentInfo.browser);

  // Handle bot detection
  if (userAgentInfo.isBot) {
    response.headers.set('X-Is-Bot', 'true');
    // You might want to serve different content for bots
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-RateLimit-IP', clientIP);
    response.headers.set('X-RateLimit-Path', pathname);

    // Add timestamp for rate limiting tracking
    response.headers.set('X-Request-Time', new Date().toISOString());
  }

  // Authentication checks for protected routes
  const protectedPaths = ['/dashboard', '/admin', '/profile', '/settings'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    // Check multiple possible auth token locations
    const authToken = request.cookies.get('token')?.value ||
      request.cookies.get('auth-token')?.value ||
      request.cookies.get('authToken')?.value;

    if (!authToken) {
      console.log(`🔒 Protected route accessed without token: ${pathname} from ${clientIP}`);

      // Redirect to login if no token
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('reason', 'auth_required');

      const redirectResponse = NextResponse.redirect(loginUrl);
      redirectResponse.headers.set('X-Auth-Redirect', 'true');
      redirectResponse.headers.set('X-Auth-Reason', 'no_token');

      return redirectResponse;
    }

    // Add auth info to headers
    response.headers.set('X-Auth-Token-Present', 'true');
    response.headers.set('X-Protected-Route', 'true');
  }

  // Admin route protection
  if (pathname.startsWith('/dashboard/admin') || pathname.startsWith('/admin')) {
    const userRole = request.cookies.get('user-role')?.value ||
      request.cookies.get('role')?.value;

    if (userRole !== 'ADMIN') {
      console.log(`🚫 Admin route accessed by non-admin: ${userRole} from ${clientIP}`);

      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
      redirectResponse.headers.set('X-Access-Denied', 'true');
      redirectResponse.headers.set('X-Required-Role', 'ADMIN');
      redirectResponse.headers.set('X-User-Role', userRole || 'none');

      return redirectResponse;
    }

    response.headers.set('X-Admin-Access', 'true');
  }

  // Author route protection (admin or author)
  const authorPaths = [
    '/dashboard/articles/create',
    '/dashboard/articles/edit',
    '/dashboard/articles/manage',
    '/create-article',
    '/edit-article'
  ];
  const isAuthorPath = authorPaths.some(path => pathname.startsWith(path));

  if (isAuthorPath) {
    const userRole = request.cookies.get('user-role')?.value ||
      request.cookies.get('role')?.value;

    if (userRole !== 'ADMIN' && userRole !== 'AUTHOR') {
      console.log(`🚫 Author route accessed by non-author: ${userRole} from ${clientIP}`);

      const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));
      redirectResponse.headers.set('X-Access-Denied', 'true');
      redirectResponse.headers.set('X-Required-Role', 'AUTHOR_OR_ADMIN');
      redirectResponse.headers.set('X-User-Role', userRole || 'none');

      return redirectResponse;
    }

    response.headers.set('X-Author-Access', 'true');
  }

  // Handle auth redirects for already authenticated users
  const authPaths = ['/login', '/register', '/signin', '/signup'];
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  if (isAuthPath) {
    const authToken = request.cookies.get('token')?.value ||
      request.cookies.get('auth-token')?.value;

    if (authToken) {
      console.log(`↩️ Authenticated user accessing auth page: ${pathname} from ${clientIP}`);

      // Redirect to dashboard if already authenticated
      const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';
      const redirectResponse = NextResponse.redirect(new URL(redirectTo, request.url));
      redirectResponse.headers.set('X-Auth-Skip', 'true');
      redirectResponse.headers.set('X-Already-Authenticated', 'true');

      return redirectResponse;
    }
  }

  // Handle PWA detection
  const displayMode = request.headers.get('sec-fetch-dest');
  const isPWA = displayMode === 'document' &&
    request.headers.get('sec-fetch-mode') === 'navigate' &&
    request.headers.get('sec-fetch-site') === 'none';

  response.headers.set('X-Is-PWA', isPWA.toString());

  // Handle special routes
  if (pathname === '/') {
    response.headers.set('X-Route-Type', 'home');
  } else if (pathname.startsWith('/api/')) {
    response.headers.set('X-Route-Type', 'api');
  } else if (isProtectedPath) {
    response.headers.set('X-Route-Type', 'protected');
  } else {
    response.headers.set('X-Route-Type', 'public');
  }

  // Add performance headers
  response.headers.set('X-Middleware-Start', Date.now().toString());

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
      ? 'https://newticax.vercel.app'
      : 'http://localhost:3000'
    );
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  }

  // Add cache control headers
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (pathname.includes('static') || pathname.includes('assets')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    response.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🌐 ${request.method} ${pathname} from ${clientIP} (${geoInfo.country}) - ${userAgentInfo.browser}/${userAgentInfo.isMobile ? 'mobile' : 'desktop'}`);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - but we still want to process them for headers
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js, service-worker.js (service worker)
     * - manifest.json (PWA manifest)
     * - robots.txt, sitemap.xml (SEO files)
     * - *.png, *.jpg, *.jpeg, *.gif, *.svg (image files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|service-worker.js|manifest.json|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
};