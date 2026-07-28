import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, react } from "../utils.js";
import { BOT_CONFIG } from "../config.js";
import OpenAI from "openai";
import axios from "axios";

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI({ apiKey: BOT_CONFIG.openaiKey });
  return openai;
}

// Free image generation — no key needed
async function generateImage(prompt: string): Promise<Buffer> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true`;
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 30000 });
  return Buffer.from(res.data);
}

// Free TTS via StreamElements — no key needed
async function tts(text: string): Promise<Buffer> {
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(text.slice(0, 300))}`;
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
  return Buffer.from(res.data);
}

export async function handleAI(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  _sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;

  switch (command) {
    case "ai":
    case "gpt": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a question.\nExample: `.ai What is quantum physics?`");
        return true;
      }
      await react(sock, msg, "🤔");
      try {
        const ai = getOpenAI();
        const res = await ai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are Venom MD, a helpful WhatsApp AI assistant made by Taprush EMP. Be concise and conversational." },
            { role: "user", content: args },
          ],
          max_tokens: 1000,
        });
        await react(sock, msg, "✅");
        await reply(sock, msg, `🤖 *Venom AI:*\n\n${res.choices[0].message.content ?? "No response."}`);
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ AI error: ${e.message}`);
      }
      return true;
    }

    case "dalle":
    case "imagine": {
      if (!args) {
        await reply(sock, msg, "❌ Describe the image.\nExample: `.imagine a glowing snake in the dark`");
        return true;
      }
      await react(sock, msg, "🎨");
      try {
        const buffer = await generateImage(args);
        await sock.sendMessage(jid, { image: buffer, caption: `🎨 *Image:* ${args}` }, { quoted: msg });
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ Image generation failed: ${e.message}`);
      }
      return true;
    }

    case "enhance": {
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg?.imageMessage) {
        await reply(sock, msg, "❌ Quote an image to enhance.");
        return true;
      }
      await react(sock, msg, "✨");
      try {
        const ai = getOpenAI();
        const completion = await ai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: `Describe this image in detail for image generation: ${args || "make it clearer and more vibrant"}` },
              { type: "image_url", image_url: { url: quotedMsg.imageMessage.url! } },
            ],
          }],
          max_tokens: 500,
        });
        const description = completion.choices[0].message.content ?? args;
        const buffer = await generateImage(`Enhanced, high-quality version: ${description}`);
        await sock.sendMessage(jid, { image: buffer, caption: "✨ *Enhanced Image*" }, { quoted: msg });
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ Enhancement failed: ${e.message}`);
      }
      return true;
    }

    case "removebg": {
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quotedMsg?.imageMessage) {
        await reply(sock, msg, "❌ Quote an image to remove background.");
        return true;
      }
      await react(sock, msg, "🖼️");
      try {
        const res = await axios.post(
          "https://api.remove.bg/v1.0/removebg",
          { image_url: quotedMsg.imageMessage.url, size: "auto" },
          { headers: { "X-Api-Key": process.env.REMOVEBG_API_KEY ?? "DEMO" }, responseType: "arraybuffer" }
        );
        await sock.sendMessage(jid, { image: Buffer.from(res.data), caption: "🖼️ *Background Removed*" }, { quoted: msg });
        await react(sock, msg, "✅");
      } catch {
        await react(sock, msg, "❌");
        await reply(sock, msg, "❌ Background removal failed.");
      }
      return true;
    }

    case "mimicvoice": {
      if (!args) {
        await reply(sock, msg, "❌ Provide text.\nExample: `.mimicvoice Hello world`");
        return true;
      }
      await react(sock, msg, "🎙️");
      try {
        const buffer = await tts(args);
        await sock.sendMessage(jid, { audio: buffer, mimetype: "audio/mpeg", ptt: true }, { quoted: msg });
        await react(sock, msg, "✅");
      } catch (e: any) {
        await react(sock, msg, "❌");
        await reply(sock, msg, `❌ TTS failed: ${e.message}`);
      }
      return true;
    }

    case "wiki": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a search term.\nExample: `.wiki Albert Einstein`");
        return true;
      }
      try {
        const res = await axios.get("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(args));
        const d = res.data;
        await reply(sock, msg, `📖 *${d.title}*\n\n${d.extract?.slice(0, 1500) ?? "No summary."}\n\n🔗 ${d.content_urls?.desktop?.page ?? ""}`);
      } catch {
        await reply(sock, msg, `❌ Could not find Wikipedia article for: *${args}*`);
      }
      return true;
    }

    case "weather": {
      if (!args) {
        await reply(sock, msg, "❌ Provide a city.\nExample: `.weather Lagos`");
        return true;
      }
      try {
        const res = await axios.get(`https://wttr.in/${encodeURIComponent(args)}?format=4`);
        await reply(sock, msg, `🌤️ *Weather for ${args}*\n\n${res.data}`);
      } catch {
        await reply(sock, msg, `❌ Could not get weather for: *${args}*`);
      }
      return true;
    }

    case "trt":
    case "translate": {
      if (!args) {
        await reply(sock, msg, "❌ Provide text to translate.\nExample: `.trt Hello how are you`");
        return true;
      }
      try {
        const ai = getOpenAI();
        const res = await ai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: `Detect the language and translate this text to English (if already English, translate to Yoruba). Reply with ONLY the translated text:\n\n${args}`,
          }],
          max_tokens: 500,
        });
        await reply(sock, msg, `🌐 *Translation:*\n\n${res.choices[0].message.content ?? ""}`);
      } catch {
        await reply(sock, msg, "❌ Translation failed.");
      }
      return true;
    }

    case "roast": {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      const target = mentioned[0] ? `@${mentioned[0].split("@")[0]}` : args || "that person";
      try {
        const ai = getOpenAI();
        const res = await ai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a savage but funny roast comedian. Keep it under 3 sentences." },
            { role: "user", content: `Roast ${target} in a funny way.` },
          ],
          max_tokens: 200,
        });
        await reply(sock, msg, `🔥 *Roast for ${target}:*\n\n${res.choices[0].message.content ?? ""}`);
      } catch {
        await reply(sock, msg, "🔥 Your face is a great roast on its own! 😂");
      }
      return true;
    }

    default:
      return false;
  }
}
