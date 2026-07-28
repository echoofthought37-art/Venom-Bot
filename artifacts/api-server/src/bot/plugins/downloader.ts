import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, react } from "../utils.js";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

async function ytDownload(url: string, format: "mp3" | "mp4"): Promise<Buffer> {
  const tmpFile = path.join(os.tmpdir(), `venom_${Date.now()}.${format === "mp3" ? "mp3" : "mp4"}`);
  const fmt =
    format === "mp3"
      ? "-x --audio-format mp3 --audio-quality 0"
      : "-f bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4 --merge-output-format mp4";
  await execAsync(`yt-dlp ${fmt} -o "${tmpFile}" "${url}"`);
  const buf = fs.readFileSync(tmpFile);
  fs.unlinkSync(tmpFile);
  return buf;
}

async function tikwmDownload(url: string): Promise<{ buffer: Buffer; title: string }> {
  const res = await axios.post(
    "https://www.tikwm.com/api/",
    new URLSearchParams({ url, hd: "1" }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  const data = res.data?.data;
  if (!data?.play) throw new Error("No video URL");
  const vid = await axios.get(data.play, { responseType: "arraybuffer" });
  return { buffer: Buffer.from(vid.data), title: data.title || "TikTok Video" };
}

async function igDownload(url: string): Promise<Buffer> {
  // Use a public Instagram downloader API
  const res = await axios.get(
    `https://api.allinone.com.de/api?request=instagram&url=${encodeURIComponent(url)}`
  );
  const mediaUrl = res.data?.media?.[0]?.url || res.data?.url;
  if (!mediaUrl) throw new Error("No media URL");
  const vid = await axios.get(mediaUrl, { responseType: "arraybuffer" });
  return Buffer.from(vid.data);
}

export async function handleDownloader(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;

  switch (command) {
    case "ytmp3": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a YouTube URL.\nExample: `.ytmp3 https://youtube.com/watch?v=...`");
        return true;
      }
      await react(sock, msg, "⏳");
      await reply(sock, msg, "⏳ Downloading audio, please wait...");
      try {
        const buffer = await ytDownload(args, "mp3");
        await sock.sendMessage(
          jid,
          { audio: buffer, mimetype: "audio/mpeg", fileName: "audio.mp3" },
          { quoted: msg }
        );
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ Download failed: ${e.message}\n\nMake sure yt-dlp is installed.`);
      }
      return true;
    }

    case "ytmp4": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a YouTube URL.\nExample: `.ytmp4 https://youtube.com/watch?v=...`");
        return true;
      }
      await react(sock, msg, "⏳");
      await reply(sock, msg, "⏳ Downloading video, please wait...");
      try {
        const buffer = await ytDownload(args, "mp4");
        await sock.sendMessage(
          jid,
          { video: buffer, caption: "📹 Downloaded by Venom MD" },
          { quoted: msg }
        );
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ Download failed: ${e.message}\n\nMake sure yt-dlp is installed.`);
      }
      return true;
    }

    case "tiktok":
    case "tt": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a TikTok URL.\nExample: `.tiktok https://tiktok.com/@user/video/...`");
        return true;
      }
      await react(sock, msg, "⏳");
      await reply(sock, msg, "⏳ Downloading TikTok, please wait...");
      try {
        const { buffer, title } = await tikwmDownload(args);
        await sock.sendMessage(
          jid,
          { video: buffer, caption: `📱 *${title}*\n\n_Downloaded by Venom MD_` },
          { quoted: msg }
        );
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ TikTok download failed: ${e.message}`);
      }
      return true;
    }

    case "ig":
    case "instagram": {
      if (!args) {
        await reply(sock, msg, "❌ Provide an Instagram URL.");
        return true;
      }
      await react(sock, msg, "⏳");
      await reply(sock, msg, "⏳ Downloading Instagram media...");
      try {
        const buffer = await igDownload(args);
        await sock.sendMessage(
          jid,
          { video: buffer, caption: "📸 *Instagram*\n\n_Downloaded by Venom MD_" },
          { quoted: msg }
        );
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ Instagram download failed: ${e.message}`);
      }
      return true;
    }

    case "fb":
    case "facebook": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a Facebook video URL.");
        return true;
      }
      await react(sock, msg, "⏳");
      await reply(sock, msg, "⏳ Downloading Facebook video...");
      try {
        const res = await axios.get(
          `https://api.aghatech.com/facebook-video?url=${encodeURIComponent(args)}`
        );
        const videoUrl = res.data?.links?.["Download High Quality"] || res.data?.url;
        if (!videoUrl) throw new Error("No video URL found");
        const vid = await axios.get(videoUrl, { responseType: "arraybuffer" });
        await sock.sendMessage(
          jid,
          { video: Buffer.from(vid.data), caption: "📘 *Facebook*\n\n_Downloaded by Venom MD_" },
          { quoted: msg }
        );
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ Facebook download failed: ${e.message}`);
      }
      return true;
    }

    case "apk": {
      if (!args) {
        await reply(sock, msg, "❌ Provide an app name.\nExample: `.apk WhatsApp`");
        return true;
      }
      await react(sock, msg, "🔍");
      try {
        const res = await axios.get(
          `https://api.apkpure.com/apk/search?q=${encodeURIComponent(args)}&limit=1`
        );
        const app = res.data?.data?.[0];
        if (!app) {
          await reply(sock, msg, `❌ No APK found for: *${args}*`);
          return true;
        }
        const info = `📦 *APK Found*\n\n*Name:* ${app.title}\n*Version:* ${app.currentVersionName}\n*Size:* ${app.fileSize}\n*Rating:* ${app.score}\n\n🔗 ${app.link}`;
        await reply(sock, msg, info);
      } catch {
        await reply(sock, msg, `❌ APK search failed for: *${args}*`);
      }
      return true;
    }

    default:
      return false;
  }
}
