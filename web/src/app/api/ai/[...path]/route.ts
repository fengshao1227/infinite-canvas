import { type NextRequest, NextResponse } from "next/server";

const AI_BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
const AI_API_KEY = process.env.AI_API_KEY || "";

type ChannelConfig = { id: string; baseUrl: string; apiKey: string };
const AI_CHANNELS: ChannelConfig[] = (() => {
    try { return JSON.parse(process.env.AI_CHANNELS || "[]"); } catch { return []; }
})();

function resolveChannel(channelId: string | null): { baseUrl: string; apiKey: string } {
    if (channelId && channelId !== "default") {
        const ch = AI_CHANNELS.find((c) => c.id === channelId);
        if (ch) return { baseUrl: ch.baseUrl.replace(/\/+$/, ""), apiKey: ch.apiKey };
    }
    return { baseUrl: AI_BASE_URL, apiKey: AI_API_KEY };
}

function buildUpstreamUrl(segments: string[], baseUrl: string) {
    const lower = baseUrl.toLowerCase();
    const base = lower.endsWith("/v1") || lower.endsWith("/api/v3") || lower.endsWith("/api/plan/v3") ? baseUrl : `${baseUrl}/v1`;
    return `${base}/${segments.join("/")}`;
}

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    const { path } = await params;
    const channelId = request.headers.get("x-channel-id");
    const { baseUrl, apiKey } = resolveChannel(channelId);
    const url = buildUpstreamUrl(path, baseUrl);

    const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
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
