import { type NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const CHANNELS_FILE = process.env.DATA_DIR ? `${process.env.DATA_DIR}/channels.json` : "/app/data/channels.json";

function isAdmin(request: NextRequest) {
    return ADMIN_PASSWORD && request.cookies.get("admin_token")?.value === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
    if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        const data = JSON.parse(readFileSync(CHANNELS_FILE, "utf-8"));
        return NextResponse.json(data);
    } catch {
        return NextResponse.json([]);
    }
}

export async function POST(request: NextRequest) {
    if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const channels = await request.json();
    if (!Array.isArray(channels)) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    try {
        mkdirSync(dirname(CHANNELS_FILE), { recursive: true });
        writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2), "utf-8");
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
}
