import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE_NAME = "epilog_portfolio_access";
const ACCESS_COOKIE_VALUE = "granted";
const FALLBACK_ACCESS_KEY = "kjmpp";

function normalizeKey(raw: string | null): string {
  if (!raw) {
    return "";
  }

  const trimmed = raw.trim();
  return trimmed.replace(/^['\"]|['\"]$/g, "");
}

function isStaticRequest(pathname: string): boolean {
  if (pathname.startsWith("/_next")) {
    return true;
  }

  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return true;
  }

  // Public 파일 요청 (예: /images/logo.webp, /file.svg)
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (isStaticRequest(pathname)) {
    return NextResponse.next();
  }

  const isUnlocked = request.cookies.get(ACCESS_COOKIE_NAME)?.value === ACCESS_COOKIE_VALUE;

  if (isUnlocked) {
    return NextResponse.next();
  }

  const inputKey = normalizeKey(request.nextUrl.searchParams.get("key"));
  const accessKey = process.env.PORTFOLIO_ACCESS_KEY ?? FALLBACK_ACCESS_KEY;

  if (inputKey && inputKey === accessKey) {
    const redirectUrl = request.nextUrl.clone();

    if (redirectUrl.pathname === "/private") {
      redirectUrl.pathname = "/";
    }

    redirectUrl.searchParams.delete("key");

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: ACCESS_COOKIE_VALUE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  }

  if (pathname === "/private") {
    return NextResponse.next();
  }

  const privateUrl = request.nextUrl.clone();
  privateUrl.pathname = "/private";
  privateUrl.search = "";

  return NextResponse.redirect(privateUrl);
}

export const config = {
  matcher: "/:path*",
};
