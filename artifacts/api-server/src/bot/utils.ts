import type {
  WASocket,
  WAMessage,
  proto,
  AnyMessageContent,
} from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { BOT_CONFIG } from "./config.js";

export function isOwner(jid: string): boolean {
  return jid.replace(/[^0-9]/g, "") === BOT_CONFIG.ownerNumber;
}

export function isAdmin(
  participants: proto.IGroupParticipant[],
  jid: string
): boolean {
  return participants.some(
    (p) => p.jid === jid && (p.admin === "admin" || p.admin === "superadmin")
  );
}

export function isBotAdmin(
  participants: proto.IGroupParticipant[],
  botJid: string
): boolean {
  return participants.some(
    (p) => p.jid === botJid && (p.admin === "admin" || p.admin === "superadmin")
  );
}

export function getMentioned(msg: WAMessage): string[] {
  const body =
    msg.message?.extendedTextMessage ||
    msg.message?.conversation;
  const mentions =
    (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? []);
  return mentions;
}

export function getBody(msg: WAMessage): string {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    ""
  );
}

export function getQuotedMsg(msg: WAMessage) {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage ?? null;
}

export function getSender(msg: WAMessage): string {
  return (
    msg.key.participant ||
    msg.key.remoteJid ||
    msg.participant ||
    ""
  );
}

export function isGroup(jid: string): boolean {
  return jid.endsWith("@g.us");
}

export async function react(
  sock: WASocket,
  msg: WAMessage,
  emoji: string
): Promise<void> {
  try {
    await sock.sendMessage(msg.key.remoteJid!, {
      react: { text: emoji, key: msg.key },
    });
  } catch {}
}

export async function reply(
  sock: WASocket,
  msg: WAMessage,
  text: string
): Promise<void> {
  await sock.sendMessage(
    msg.key.remoteJid!,
    { text },
    { quoted: msg }
  );
}

export async function sendMsg(
  sock: WASocket,
  jid: string,
  content: AnyMessageContent
): Promise<void> {
  await sock.sendMessage(jid, content);
}

export async function getMediaBuffer(
  sock: WASocket,
  msg: WAMessage
): Promise<Buffer | null> {
  try {
    const buffer = await downloadMediaMessage(msg, "buffer", {});
    return buffer as Buffer;
  } catch {
    return null;
  }
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function getArgs(body: string, prefix: string): string {
  const parts = body.slice(prefix.length).trim().split(/\s+/);
  return parts.slice(1).join(" ");
}

export function getCommand(body: string, prefix: string): string {
  return body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
}

export function phoneToJid(phone: string): string {
  return phone.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
}

export function jidToPhone(jid: string): string {
  return jid.replace(/@s\.whatsapp\.net|@g\.us/g, "");
}
