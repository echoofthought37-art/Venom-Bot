/**
 * Session utilities for Venom MD.
 *
 * Instead of sending users a huge base64 blob, we:
 *  1. Compress + encode the session folder → full string
 *  2. Save it locally under a short ID like VENOM_AB12CD34
 *  3. Send the user just that short ID
 *  4. Expose GET /api/bot/session/:id so their Render bot can fetch
 *     the full string on first boot using SESSION_ID + PAIRING_SITE_URL
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { promisify } from "util";
import crypto from "crypto";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Where short-ID session files are kept
const STORE_DIR = path.resolve("./sessions-store");

// ── helpers ────────────────────────────────────────────────────────────────

function readDirFiles(root: string, dir: string = root): Record<string, string> {
  const files: Record<string, string> = {};
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      Object.assign(files, readDirFiles(root, full));
    } else {
      files[path.relative(root, full)] = fs.readFileSync(full).toString("base64");
    }
  }
  return files;
}

async function compress(data: string): Promise<string> {
  return (await gzip(Buffer.from(data, "utf8"))).toString("base64");
}

async function decompress(b64: string): Promise<string> {
  return (await gunzip(Buffer.from(b64, "base64"))).toString("utf8");
}

// ── public API ─────────────────────────────────────────────────────────────

/** Compress the session folder into a portable string */
export async function exportSessionString(sessionPath: string): Promise<string> {
  return compress(JSON.stringify(readDirFiles(sessionPath)));
}

/** Restore a session folder from a portable string */
export async function importSessionString(
  sessionString: string,
  sessionPath: string
): Promise<void> {
  const files: Record<string, string> = JSON.parse(await decompress(sessionString));
  fs.mkdirSync(sessionPath, { recursive: true });
  for (const [rel, b64] of Object.entries(files)) {
    const full = path.join(sessionPath, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, Buffer.from(b64, "base64"));
  }
}

/** Check if a session folder has valid credentials */
export function hasSession(sessionPath: string): boolean {
  return fs.existsSync(path.join(sessionPath, "creds.json"));
}

/**
 * Save the session under a short ID and return that ID.
 * e.g.  VENOM_AB12CD34
 */
export async function saveSessionWithShortId(sessionPath: string): Promise<string> {
  const sessionString = await exportSessionString(sessionPath);
  const shortSuffix = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 chars
  const id = `VENOM_${shortSuffix}`;

  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STORE_DIR, `${id}.json`), JSON.stringify({ id, session: sessionString }));
  return id;
}

/** Load a stored session string by short ID */
export function loadSessionById(id: string): string | null {
  const file = path.join(STORE_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data.session ?? null;
  } catch {
    return null;
  }
}

/** List all stored session IDs (for admin visibility) */
export function listStoredSessions(): string[] {
  if (!fs.existsSync(STORE_DIR)) return [];
  return fs
    .readdirSync(STORE_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
}
