import { type NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const s3 = new S3Client({
    region: process.env.STORAGE_REGION || "auto",
    endpoint: process.env.STORAGE_ENDPOINT || "",
    credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || "",
    },
});

const BUCKET = process.env.STORAGE_BUCKET_NAME || "museai";
const PUBLIC_URL = (process.env.STORAGE_PUBLIC_URL || "").replace(/\/+$/, "");
const UPLOAD_PATH = process.env.STORAGE_UPLOAD_PATH || "ai-studio";

const EXT_MAP: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
};

export async function POST(request: NextRequest) {
    if (!process.env.STORAGE_ENDPOINT) {
        return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const contentType = request.headers.get("content-type") || "";

    let buffer: Buffer;
    let mimeType: string;

    if (contentType.includes("application/json")) {
        const body = await request.json();
        const dataUrl = body.dataUrl as string;
        if (!dataUrl?.startsWith("data:")) {
            return NextResponse.json({ error: "Invalid dataUrl" }, { status: 400 });
        }
        const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
        if (!match) return NextResponse.json({ error: "Invalid data URL format" }, { status: 400 });
        mimeType = match[1];
        buffer = Buffer.from(match[2], "base64");
    } else {
        buffer = Buffer.from(await request.arrayBuffer());
        mimeType = contentType.split(";")[0].trim() || "image/png";
    }

    const ext = EXT_MAP[mimeType] || "bin";
    const key = `${UPLOAD_PATH}/${nanoid()}.${ext}`;

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
    }));

    const url = `${PUBLIC_URL}/${key}`;
    return NextResponse.json({ url });
}
