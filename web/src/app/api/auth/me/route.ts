import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const token = request.cookies.get("session")?.value;
    if (!token) return NextResponse.json({ user: null });
    const session = verifySession(token);
    return NextResponse.json({ user: session });
}
