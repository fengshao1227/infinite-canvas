import { type NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export async function POST(request: NextRequest) {
    if (!ADMIN_PASSWORD) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });

    const body = (await request.json()) as { password?: string };
    if (body.password === ADMIN_PASSWORD) {
        const response = NextResponse.json({ ok: true });
        response.cookies.set("admin_token", ADMIN_PASSWORD, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 86400,
            path: "/",
        });
        return response;
    }
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
}

export async function GET(request: NextRequest) {
    if (!ADMIN_PASSWORD) return NextResponse.json({ ok: false }, { status: 503 });
    const token = request.cookies.get("admin_token")?.value;
    return NextResponse.json({ ok: token === ADMIN_PASSWORD });
}
