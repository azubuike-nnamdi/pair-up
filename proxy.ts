import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE, verifySession } from "@/lib/auth/session-token"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)
  const isAdminLogin = pathname === "/admin/login"
  const isAdmin = pathname.startsWith("/admin")
  const isHome = pathname.startsWith("/home")

  if (isAdmin && !isAdminLogin && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  if (isAdminLogin && session?.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  if (isHome && session?.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url))
  }

  if (isHome && session?.role !== "person") {
    const url = new URL("/login", request.url)
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  if (
    (pathname === "/login" || pathname === "/login/sent") &&
    session?.role === "person"
  ) {
    return NextResponse.redirect(new URL("/home", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
