import { NextResponse, type NextRequest } from "next/server";
import { createUser, signSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim();
    const password = body.password;
    if (!username || !password) return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    if (username.length < 2 || username.length > 20) return NextResponse.json({ error: "用户名需要 2-20 个字符" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });

    const user = createUser(username, password);
    if (!user) return NextResponse.json({ error: "用户名已存在" }, { status: 409 });

    const token = signSession(user.id, user.username);
    const response = NextResponse.json({ ok: true, user: { id: user.id, username: user.username } });
    response.cookies.set("session", token, { httpOnly: true, sameSite: "strict", maxAge: 7 * 86400, path: "/" });
    return response;
}
