import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    try {
        const response = await fetch(url);
        if (!response.ok) return new NextResponse(null, { status: response.status });

        const buffer = await response.arrayBuffer();
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "image/png",
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch {
        return NextResponse.json({ error: "Proxy failed" }, { status: 502 });
    }
}
