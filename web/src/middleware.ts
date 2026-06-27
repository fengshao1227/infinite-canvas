import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/", "/api/admin/"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.next();
    if (pathname.startsWith("/_next/") || pathname.startsWith("/favicon") || pathname.endsWith(".svg") || pathname.endsWith(".ico")) return NextResponse.next();

    const session = request.cookies.get("session")?.value;
    if (!session) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|icons/).*)"],
};
