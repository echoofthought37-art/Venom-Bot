// In-memory state store for Venom MD settings
// Format: groupJid -> settings

export interface GroupSettings {
  antilink: boolean;
  antibot: boolean;
  antispam: boolean;
  anticall: boolean;
  antipv: boolean;
  antifake: boolean;
  antiraid: boolean;
  antinsfw: boolean;
  antibadword: boolean;
  antivv: boolean;
  welcome: string | null;
  bye: string | null;
  warn: Record<string, number>; // jid -> warn count
  lockdown: boolean;
}

export interface BotSettings {
  mode: "public" | "self";
  prefix: string;
  autotyping: boolean;
  autorecording: boolean;
  autoread: boolean;
  autoreact: boolean;
  autopresence: boolean;
  blockedUsers: Set<string>;
}

export interface EconomyUser {
  coins: number;
  xp: number;
  level: number;
  lastDaily: number;
  premium: boolean;
}

const defaultGroupSettings = (): GroupSettings => ({
  antilink: false,
  antibot: false,
  antispam: false,
  anticall: false,
  antipv: false,
  antifake: false,
  antiraid: false,
  antinsfw: false,
  antibadword: false,
  antivv: false,
  welcome: null,
  bye: null,
  warn: {},
  lockdown: false,
});

export const groupSettings = new Map<string, GroupSettings>();
export const userEconomy = new Map<string, EconomyUser>();
export const botSettings: BotSettings = {
  mode: "public",
  prefix: ".",
  autotyping: false,
  autorecording: false,
  autoread: false,
  autoreact: false,
  autopresence: false,
  blockedUsers: new Set(),
};

export function getGroupSettings(jid: string): GroupSettings {
  if (!groupSettings.has(jid)) groupSettings.set(jid, defaultGroupSettings());
  return groupSettings.get(jid)!;
}

export function getEconomyUser(jid: string): EconomyUser {
  if (!userEconomy.has(jid)) {
    userEconomy.set(jid, {
      coins: 100,
      xp: 0,
      level: 1,
      lastDaily: 0,
      premium: false,
    });
  }
  return userEconomy.get(jid)!;
}

// Spam tracker: jid -> {count, last}
export const spamTracker = new Map<string, { count: number; last: number }>();

// shadowban list
export const shadowBanned = new Set<string>();

// botspy list (groups being monitored)
export const botSpyGroups = new Set<string>();
