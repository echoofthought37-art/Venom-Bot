import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, isAdmin, isBotAdmin, isOwner, getSender, jidToPhone, sleep } from "../utils.js";
import { getGroupSettings } from "../state.js";

// URL regex
const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;
const WA_LINK_REGEX = /(https?:\/\/)?(www\.)?chat\.whatsapp\.com\/[A-Za-z0-9]+/gi;
const FAKE_NUMBERS = ["00000000", "1234567890"];

export async function handleAnti(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;
  if (!jid.endsWith("@g.us")) return false;

  let participants: any[] = [];
  let botJid = (sock.user?.id ?? "").split(":")[0] + "@s.whatsapp.net";
  try {
    const meta = await sock.groupMetadata(jid);
    participants = meta.participants;
  } catch {}

  const isAdminUser = isAdmin(participants, sender);
  const isBotAdminUser = isBotAdmin(participants, botJid);
  const isOwnerUser = isOwner(sender);
  const settings = getGroupSettings(jid);

  if (!isAdminUser && !isOwnerUser) {
    await reply(sock, msg, "❌ Admin only command.");
    return true;
  }

  const toggle = (key: keyof typeof settings, name: string) => {
    const sub = args.toLowerCase();
    if (sub === "on") {
      (settings as any)[key] = true;
      return `✅ *${name}* enabled.`;
    } else if (sub === "off") {
      (settings as any)[key] = false;
      return `❌ *${name}* disabled.`;
    }
    return `Current: *${(settings as any)[key] ? "ON" : "OFF"}*\nUsage: \`.${command} on/off\``;
  };

  switch (command) {
    case "antilink":
      await reply(sock, msg, toggle("antilink", "Anti-Link"));
      return true;
    case "antibot":
      await reply(sock, msg, toggle("antibot", "Anti-Bot"));
      return true;
    case "antispam":
      await reply(sock, msg, toggle("antispam", "Anti-Spam"));
      return true;
    case "anticall":
      await reply(sock, msg, toggle("anticall", "Anti-Call"));
      return true;
    case "antipv":
      await reply(sock, msg, toggle("antipv", "Anti-PV"));
      return true;
    case "antifake":
      await reply(sock, msg, toggle("antifake", "Anti-Fake"));
      return true;
    case "antiraid":
      await reply(sock, msg, toggle("antiraid", "Anti-Raid"));
      return true;
    case "antinsfw":
      await reply(sock, msg, toggle("antinsfw", "Anti-NSFW"));
      return true;
    case "antibadword":
      await reply(sock, msg, toggle("antibadword", "Anti-Bad Word"));
      return true;
    case "antivv":
      await reply(sock, msg, toggle("antivv", "Anti-View-Once"));
      return true;
    default:
      return false;
  }
}

// Called from main message handler to enforce anti-features
export async function enforceAntiFeatures(
  sock: WASocket,
  msg: WAMessage,
  body: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;
  if (!jid.endsWith("@g.us")) return false;

  const settings = getGroupSettings(jid);
  let botJid = (sock.user?.id ?? "").split(":")[0] + "@s.whatsapp.net";
  let participants: any[] = [];
  try {
    const meta = await sock.groupMetadata(jid);
    participants = meta.participants;
  } catch {
    return false;
  }

  const isSenderAdmin = isAdmin(participants, sender);
  const isBotAdminUser = isBotAdmin(participants, botJid);
  const isOwnerUser = isOwner(sender);

  // Skip admins/owner for anti-features
  if (isSenderAdmin || isOwnerUser) return false;

  // Anti-link
  if (settings.antilink && WA_LINK_REGEX.test(body)) {
    if (isBotAdminUser) {
      await sock.sendMessage(jid, { delete: msg.key });
      await sock.groupParticipantsUpdate(jid, [sender], "remove");
      await sock.sendMessage(jid, {
        text: `🔗 *Anti-Link:* @${jidToPhone(sender)} was kicked for sharing a WhatsApp link.`,
        mentions: [sender],
      });
    }
    return true;
  }

  // Anti-spam (5 messages in 3 seconds)
  const now = Date.now();
  const spamKey = `${jid}:${sender}`;

  // Anti-fake number check
  if (settings.antifake) {
    const phone = jidToPhone(sender);
    const isShort = phone.length < 7;
    if (isShort && isBotAdminUser) {
      await sock.groupParticipantsUpdate(jid, [sender], "remove");
      await reply(sock, msg, `🚫 *Anti-Fake:* Removed fake number @${phone}`);
      return true;
    }
  }

  // Anti-view-once: forward the view-once media
  if (settings.antivv && msg.message?.viewOnceMessage) {
    const inner = msg.message.viewOnceMessage.message;
    if (inner) {
      await sock.sendMessage(jid, inner as any, { quoted: msg });
    }
    return false; // don't block message, just copy it
  }

  return false;
}
