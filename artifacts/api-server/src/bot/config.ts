export const SUPER_OWNER = "2349165331115"; // Taprush EMP — permanent super owner

export const BOT_CONFIG = {
  name: process.env.BOT_NAME ?? "Venom MD",
  // OWNER_NUMBER env var lets each self-hosted user set their own number
  ownerNumber: process.env.OWNER_NUMBER ?? "2349165331115",
  prefix: process.env.BOT_PREFIX ?? ".",
  version: "2.0.0",
  author: "Taprush EMP",
  sessionPath: "./session",
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  // Derived
  get ownerJid() {
    return `${this.ownerNumber}@s.whatsapp.net`;
  },
  get superOwnerJid() {
    return `${SUPER_OWNER}@s.whatsapp.net`;
  },
};

export const WELCOME_MSG = `╔══════════════════╗
║   🐍 *VENOM MD*   ║
╚══════════════════╝
_Powered by Taprush EMP_`;

export const MENU_HEADER = `╔══════════════════╗
║   🐍 *VENOM MD v2.0*   ║
╚══════════════════╝`;
