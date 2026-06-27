import { NextResponse, type NextRequest } from "next/server";
import { authenticateUser, signSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim();
    const password = body.password;
    if (!username || !password) return NextResponse.json({ error: "请输入用户名和密码" }, { status: 400 });

    const user = authenticateUser(username, password);
    if (!user) return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });

    const token = signSession(user.id, user.username);
    const response = NextResponse.json({ ok: true, user: { id: user.id, username: user.username } });
    response.cookies.set("session", token, { httpOnly: true, sameSite: "strict", maxAge: 7 * 86400, path: "/" });
    return response;
}
