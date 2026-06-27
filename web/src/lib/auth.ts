import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "ai-studio-default-secret";
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "data");
const USERS_FILE = join(DATA_DIR, "users.json");

export type User = {
    id: string;
    username: string;
    passwordHash: string;
    salt: string;
    createdAt: string;
};

type UsersDB = { users: User[] };

function ensureDataDir() {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readUsers(): UsersDB {
    ensureDataDir();
    if (!existsSync(USERS_FILE)) return { users: [] };
    return JSON.parse(readFileSync(USERS_FILE, "utf-8")) as UsersDB;
}

function writeUsers(db: UsersDB) {
    ensureDataDir();
    writeFileSync(USERS_FILE, JSON.stringify(db, null, 2));
}

function hashPassword(password: string, salt: string): string {
    return scryptSync(password, salt, 64).toString("hex");
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
    const derived = scryptSync(password, salt, 64);
    return timingSafeEqual(derived, Buffer.from(hash, "hex"));
}

export function createUser(username: string, password: string): User | null {
    const db = readUsers();
    if (db.users.some((u) => u.username === username)) return null;
    const salt = randomBytes(16).toString("hex");
    const user: User = {
        id: randomBytes(8).toString("hex"),
        username,
        passwordHash: hashPassword(password, salt),
        salt,
        createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    writeUsers(db);
    return user;
}

export function authenticateUser(username: string, password: string): User | null {
    const db = readUsers();
    const user = db.users.find((u) => u.username === username);
    if (!user) return null;
    return verifyPassword(password, user.salt, user.passwordHash) ? user : null;
}

export function listUsers(): Array<{ id: string; username: string; createdAt: string }> {
    return readUsers().users.map(({ id, username, createdAt }) => ({ id, username, createdAt }));
}

export function deleteUser(id: string): boolean {
    const db = readUsers();
    const before = db.users.length;
    db.users = db.users.filter((u) => u.id !== id);
    if (db.users.length === before) return false;
    writeUsers(db);
    return true;
}

export function signSession(userId: string, username: string): string {
    const payload = JSON.stringify({ id: userId, username, exp: Date.now() + 7 * 24 * 3600 * 1000 });
    const sig = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
    return Buffer.from(payload).toString("base64url") + "." + sig;
}

export function verifySession(token: string): { id: string; username: string } | null {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const payload = Buffer.from(payloadB64, "base64url").toString();
    const expected = createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
    if (sig !== expected) return null;
    const data = JSON.parse(payload) as { id: string; username: string; exp: number };
    if (Date.now() > data.exp) return null;
    return { id: data.id, username: data.username };
}
