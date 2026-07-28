import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, isOwner } from "../utils.js";
import { botSettings } from "../state.js";

export async function handleMode(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  if (!isOwner(sender)) return false;

  const toggle = (key: keyof typeof botSettings, name: string) => {
    const sub = args.toLowerCase();
    if (sub === "on") {
      (botSettings as any)[key] = true;
      return `✅ *${name}* enabled.`;
    } else if (sub === "off") {
      (botSettings as any)[key] = false;
      return `❌ *${name}* disabled.`;
    }
    return `*${name}* is currently *${(botSettings as any)[key] ? "ON" : "OFF"}*\nUsage: \`.${command} on/off\``;
  };

  switch (command) {
    case "self":
      botSettings.mode = "self";
      await reply(sock, msg, "🔒 Bot is now in *SELF* mode — only you can use it.");
      return true;
    case "public":
      botSettings.mode = "public";
      await reply(sock, msg, "🌐 Bot is now in *PUBLIC* mode — everyone can use it.");
      return true;
    case "autotyping":
      await reply(sock, msg, toggle("autotyping", "Auto Typing"));
      return true;
    case "autorecording":
      await reply(sock, msg, toggle("autorecording", "Auto Recording"));
      return true;
    case "autoread":
      await reply(sock, msg, toggle("autoread", "Auto Read"));
      return true;
    case "autoreact":
      await reply(sock, msg, toggle("autoreact", "Auto React"));
      return true;
    case "autopresence":
      await reply(sock, msg, toggle("autopresence", "Auto Presence"));
      return true;
    default:
      return false;
  }
}
