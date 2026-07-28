import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, react, getMediaBuffer, getQuotedMsg } from "../utils.js";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import sharp from "sharp";
import axios from "axios";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

// Sticker creation using sharp
async function imageToSticker(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp()
    .toBuffer();
}

export async function handleTools(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;
  const quoted = msg.message?.extendedTextMessage?.contextInfo;
  const quotedMsg = quoted?.quotedMessage;

  switch (command) {
    case "sticker":
    case "s": {
      let buffer: Buffer | null = null;
      const imgMsg = msg.message?.imageMessage || quotedMsg?.imageMessage;
      const vidMsg = msg.message?.videoMessage || quotedMsg?.videoMessage;

      if (imgMsg) {
        try {
          const raw = await downloadMediaMessage(
            { message: quotedMsg ? { imageMessage: quotedMsg.imageMessage } : msg.message, key: msg.key } as any,
            "buffer",
            {}
          );
          buffer = Buffer.from(raw as ArrayBuffer);
        } catch {}
      } else if (vidMsg) {
        await reply(sock, msg, "🎬 Converting video to sticker...");
        const tmpIn = path.join(os.tmpdir(), `sticker_in_${Date.now()}.mp4`);
        const tmpOut = path.join(os.tmpdir(), `sticker_out_${Date.now()}.webp`);
        try {
          const raw = await downloadMediaMessage(
            { message: quotedMsg ? { videoMessage: quotedMsg.videoMessage } : msg.message, key: msg.key } as any,
            "buffer",
            {}
          );
          fs.writeFileSync(tmpIn, Buffer.from(raw as ArrayBuffer));
          await execAsync(
            `ffmpeg -i ${tmpIn} -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15" -vcodec libwebp -lossless 0 -compression_level 6 -q:v 50 -loop 0 -preset default -an -vsync 0 -t 5 ${tmpOut}`
          );
          buffer = fs.readFileSync(tmpOut);
          fs.unlinkSync(tmpIn);
          fs.unlinkSync(tmpOut);
        } catch (e: any) {
          await reply(sock, msg, `❌ Video sticker failed: ${e.message}`);
          return true;
        }
      } else {
        await reply(sock, msg, "❌ Send or quote an image/video to make a sticker.");
        return true;
      }

      if (!buffer) {
        await reply(sock, msg, "❌ Could not download media.");
        return true;
      }

      try {
        const stickerBuffer = await imageToSticker(buffer);
        await sock.sendMessage(
          jid,
          {
            sticker: stickerBuffer,
          },
          { quoted: msg }
        );
        await react(sock, msg, "✅");
      } catch (e: any) {
        await reply(sock, msg, `❌ Sticker creation failed: ${e.message}`);
      }
      return true;
    }

    case "toimg": {
      const stickerMsg = msg.message?.stickerMessage || quotedMsg?.stickerMessage;
      if (!stickerMsg) {
        await reply(sock, msg, "❌ Quote or send a sticker to convert.");
        return true;
      }
      try {
        const raw = await downloadMediaMessage(
          { message: quotedMsg ? { stickerMessage: quotedMsg.stickerMessage } : msg.message, key: msg.key } as any,
          "buffer",
          {}
        );
        const png = await sharp(Buffer.from(raw as ArrayBuffer)).png().toBuffer();
        await sock.sendMessage(jid, { image: png, caption: "🖼️ Converted from sticker" }, { quoted: msg });
      } catch {
        await reply(sock, msg, "❌ Conversion failed.");
      }
      return true;
    }

    case "vv": {
      // Reveal view-once messages
      const voMsg = msg.message?.viewOnceMessage || quotedMsg?.viewOnceMessage;
      if (!voMsg) {
        await reply(sock, msg, "❌ Quote a view-once message.");
        return true;
      }
      try {
        const inner = (voMsg as any).message;
        await sock.sendMessage(jid, inner, { quoted: msg });
      } catch {
        await reply(sock, msg, "❌ Could not reveal view-once message.");
      }
      return true;
    }

    case "ss": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a URL.\nExample: `.ss https://google.com`");
        return true;
      }
      await react(sock, msg, "📸");
      try {
        const res = await axios.get(
          `https://api.screenshotmachine.com?key=demo&url=${encodeURIComponent(args)}&dimension=1024x768`,
          { responseType: "arraybuffer" }
        );
        await sock.sendMessage(
          jid,
          { image: Buffer.from(res.data), caption: `📸 Screenshot of: ${args}` },
          { quoted: msg }
        );
      } catch {
        await reply(sock, msg, "❌ Screenshot failed.");
      }
      return true;
    }

    case "short":
    case "shorten": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a URL to shorten.\nExample: `.short https://google.com`");
        return true;
      }
      try {
        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args)}`);
        await reply(sock, msg, `🔗 *Shortened URL:*\n${res.data}`);
      } catch {
        await reply(sock, msg, "❌ URL shortening failed.");
      }
      return true;
    }

    case "tovn": {
      // Convert audio to voice note
      const audioMsg = msg.message?.audioMessage || quotedMsg?.audioMessage;
      if (!audioMsg) {
        await reply(sock, msg, "❌ Quote or send an audio file.");
        return true;
      }
      try {
        const raw = await downloadMediaMessage(
          { message: quotedMsg ? { audioMessage: quotedMsg.audioMessage } : msg.message, key: msg.key } as any,
          "buffer",
          {}
        );
        await sock.sendMessage(
          jid,
          { audio: Buffer.from(raw as ArrayBuffer), mimetype: "audio/ogg; codecs=opus", ptt: true },
          { quoted: msg }
        );
      } catch {
        await reply(sock, msg, "❌ Conversion failed.");
      }
      return true;
    }

    case "tomp3": {
      const vidMsg2 = msg.message?.videoMessage || quotedMsg?.videoMessage;
      if (!vidMsg2) {
        await reply(sock, msg, "❌ Quote or send a video file.");
        return true;
      }
      await react(sock, msg, "⏳");
      const tmpIn = path.join(os.tmpdir(), `tomp3_in_${Date.now()}.mp4`);
      const tmpOut = path.join(os.tmpdir(), `tomp3_out_${Date.now()}.mp3`);
      try {
        const raw = await downloadMediaMessage(
          { message: quotedMsg ? { videoMessage: quotedMsg.videoMessage } : msg.message, key: msg.key } as any,
          "buffer",
          {}
        );
        fs.writeFileSync(tmpIn, Buffer.from(raw as ArrayBuffer));
        await execAsync(`ffmpeg -i ${tmpIn} -vn -acodec libmp3lame -q:a 2 ${tmpOut}`);
        const buf = fs.readFileSync(tmpOut);
        await sock.sendMessage(
          jid,
          { audio: buf, mimetype: "audio/mpeg", fileName: "audio.mp3" },
          { quoted: msg }
        );
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ Conversion failed: ${e.message}`);
      } finally {
        if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
        if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
      }
      return true;
    }

    case "tomp4": {
      const audMsg = msg.message?.audioMessage || quotedMsg?.audioMessage;
      if (!audMsg) {
        await reply(sock, msg, "❌ Quote or send an audio file to convert to video.");
        return true;
      }
      await react(sock, msg, "⏳");
      const tmpIn = path.join(os.tmpdir(), `tomp4_in_${Date.now()}.mp3`);
      const tmpOut = path.join(os.tmpdir(), `tomp4_out_${Date.now()}.mp4`);
      try {
        const raw = await downloadMediaMessage(
          { message: quotedMsg ? { audioMessage: quotedMsg.audioMessage } : msg.message, key: msg.key } as any,
          "buffer",
          {}
        );
        fs.writeFileSync(tmpIn, Buffer.from(raw as ArrayBuffer));
        await execAsync(
          `ffmpeg -f lavfi -i color=c=black:s=640x360 -i ${tmpIn} -shortest -c:v libx264 -c:a aac ${tmpOut}`
        );
        const buf = fs.readFileSync(tmpOut);
        await sock.sendMessage(
          jid,
          { video: buf, caption: "🎬 Converted to MP4" },
          { quoted: msg }
        );
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ Conversion failed: ${e.message}`);
      } finally {
        if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn);
        if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
      }
      return true;
    }

    case "take": {
      // Steal sticker/image and re-send as your own
      const stickerMsg2 = msg.message?.stickerMessage || quotedMsg?.stickerMessage;
      if (!stickerMsg2) {
        await reply(sock, msg, "❌ Quote a sticker to take.");
        return true;
      }
      try {
        const raw = await downloadMediaMessage(
          { message: quotedMsg ? { stickerMessage: quotedMsg.stickerMessage } : msg.message, key: msg.key } as any,
          "buffer",
          {}
        );
        await sock.sendMessage(jid, { sticker: Buffer.from(raw as ArrayBuffer) }, { quoted: msg });
        await react(sock, msg, "✅");
      } catch {
        await reply(sock, msg, "❌ Could not take sticker.");
      }
      return true;
    }

    default:
      return false;
  }
}
