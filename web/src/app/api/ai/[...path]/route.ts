import { type NextRequest, NextResponse } from "next/server";

const AI_BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
const AI_API_KEY = process.env.AI_API_KEY || "";

function buildUpstreamUrl(segments: string[]) {
    const base = AI_BASE_URL.toLowerCase().endsWith("/v1") ? AI_BASE_URL : `${AI_BASE_URL}/v1`;
    return `${base}/${segments.join("/")}`;
}

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const url = buildUpstreamUrl(path);

    const headers: Record<string, string> = {
        Authorization: `Bearer ${AI_API_KEY}`,
    };

    const contentType = request.headers.get("content-type");
    if (contentType) headers["Content-Type"] = contentType;

    const init: RequestInit = { method: request.method, headers };

    if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = await request.arrayBuffer();
    }

    let upstream: Response;
    try {
        upstream = await fetch(url, init);
    } catch {
        return NextResponse.json({ error: "upstream unreachable" }, { status: 502 });
    }

    const resType = upstream.headers.get("content-type") || "";

    if (resType.includes("text/event-stream") && upstream.body) {
        return new NextResponse(upstream.body, {
            status: upstream.status,
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    }

    const buffer = await upstream.arrayBuffer();
    return new NextResponse(buffer, {
        status: upstream.status,
        headers: { "Content-Type": resType || "application/json" },
    });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
