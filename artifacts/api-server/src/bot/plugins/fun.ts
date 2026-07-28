import type { WASocket, WAMessage } from "@whiskeysockets/baileys";
import { reply, jidToPhone, randomChoice } from "../utils.js";

const jokes = [
  "Why don't scientists trust atoms? Because they make up everything! 😂",
  "I told my wife she should embrace her mistakes. She gave me a hug. 😅",
  "What do you call a fake noodle? An impasta! 🍝",
  "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾",
  "I'm reading a book about anti-gravity. It's impossible to put down! 📚",
  "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them! 🔢",
  "Why can't you give Elsa a balloon? Because she'll let it go! 🎈",
  "What's a skeleton's least favourite room? The living room! 💀",
];

const quotes = [
  '"The snake which cannot cast its skin has to die." — Nietzsche 🐍',
  '"Stay low, move fast, strike when ready." — Ancient Proverb ⚡',
  '"Every expert was once a beginner." — Helen Hayes 🌱',
  '"The strongest people are not those who show strength in front of us, but those who win battles we know nothing about." 💪',
  '"Silence is the best response to a fool." — Imam Ali 🤫',
  '"Work until your idols become your rivals." 🔥',
  '"Success is not for the lazy." 🎯',
  '"Be like water — adapt, flow, and conquer." 🌊',
];

const dares = [
  "Send a voice note saying 'I love Venom MD' in the most dramatic voice possible.",
  "Change your WhatsApp status to 'Venom MD is my boss' for 10 minutes.",
  "Tag 5 people and tell them a random compliment.",
  "Send your oldest saved meme in your gallery.",
  "Write a poem about your phone in 60 seconds.",
  "Send a selfie making the weirdest face you can.",
  "Speak backwards for your next 3 messages.",
];

const eightBallResponses = [
  "✅ It is certain.",
  "✅ Without a doubt.",
  "✅ Yes, definitely.",
  "✅ You may rely on it.",
  "✅ As I see it, yes.",
  "✅ Outlook good.",
  "✅ Signs point to yes.",
  "🤔 Reply hazy, try again.",
  "🤔 Ask again later.",
  "🤔 Better not tell you now.",
  "🤔 Cannot predict now.",
  "🤔 Concentrate and ask again.",
  "❌ Don't count on it.",
  "❌ My reply is no.",
  "❌ My sources say no.",
  "❌ Outlook not so good.",
  "❌ Very doubtful.",
];

const triviaQuestions = [
  { q: "What is the capital of Nigeria?", a: "Abuja" },
  { q: "How many sides does a hexagon have?", a: "6" },
  { q: "What is the largest planet in our solar system?", a: "Jupiter" },
  { q: "Who invented the telephone?", a: "Alexander Graham Bell" },
  { q: "What is 7 × 8?", a: "56" },
  { q: "What language has the most native speakers?", a: "Mandarin Chinese" },
  { q: "How many continents are there?", a: "7" },
  { q: "What is H2O?", a: "Water" },
];

export async function handleFun(
  sock: WASocket,
  msg: WAMessage,
  command: string,
  args: string,
  sender: string
): Promise<boolean> {
  const jid = msg.key.remoteJid!;

  switch (command) {
    case "joke": {
      await reply(sock, msg, `😂 *Joke Time!*\n\n${randomChoice(jokes)}`);
      return true;
    }

    case "quote": {
      await reply(sock, msg, `💬 *Quote of the Moment:*\n\n${randomChoice(quotes)}`);
      return true;
    }

    case "dare": {
      await reply(sock, msg, `🎭 *DARE:*\n\n${randomChoice(dares)}`);
      return true;
    }

    case "8ball": {
      if (!args) {
        await reply(sock, msg, "❌ Ask a yes/no question!\nExample: `.8ball Will I be rich?`");
        return true;
      }
      const response = randomChoice(eightBallResponses);
      await reply(sock, msg, `🎱 *Magic 8-Ball*\n\n❓ ${args}\n\n${response}`);
      return true;
    }

    case "ship": {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
      if (mentioned.length < 2) {
        await reply(sock, msg, "❌ Mention 2 people to ship.\nExample: `.ship @person1 @person2`");
        return true;
      }
      const [p1, p2] = mentioned;
      const percent = Math.floor(Math.random() * 101);
      const bar = "❤️".repeat(Math.floor(percent / 10)) + "🖤".repeat(10 - Math.floor(percent / 10));
      await sock.sendMessage(
        jid,
        {
          text: `💕 *SHIP METER*\n\n@${jidToPhone(p1)} + @${jidToPhone(p2)}\n\n${bar}\n\n*${percent}% compatible!*\n\n${
            percent > 75
              ? "💍 Perfect match!"
              : percent > 50
              ? "😊 Pretty good!"
              : percent > 25
              ? "😅 Needs work..."
              : "💔 Not gonna happen."
          }`,
          mentions: [p1, p2],
        }
      );
      return true;
    }

    case "trivia": {
      const q = randomChoice(triviaQuestions);
      await reply(
        sock,
        msg,
        `🧠 *TRIVIA TIME!*\n\n❓ ${q.q}\n\n_Reply with your answer!_\n\n||Answer: ${q.a}||`
      );
      return true;
    }

    default:
      return false;
  }
}
