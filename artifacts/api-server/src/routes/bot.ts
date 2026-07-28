import { Router } from "express";
import {
  getConnectionStatus,
  getPairingCode,
  requestPairingCode,
  getLatestSessionId,
  getPendingPairPhone,
} from "../bot/index.js";
import { BOT_CONFIG } from "../bot/config.js";
import { loadSessionById } from "../bot/session.js";

const botRouter = Router();

// GET /api/bot/status
botRouter.get("/bot/status", (_req, res) => {
  res.json({
    status: getConnectionStatus(),
    connected: getConnectionStatus() === "open",
    pairingCode: getPairingCode(),
    botName: BOT_CONFIG.name,
    owner: BOT_CONFIG.ownerNumber,
  });
});

// POST /api/bot/pair — request pairing code for any phone number
botRouter.post("/bot/pair", async (req, res) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "Phone number required" });
    return;
  }
  if (getConnectionStatus() === "open") {
    res.status(400).json({ error: "Bot is already connected. Reset session first." });
    return;
  }
  try {
    const code = await requestPairingCode(phone);
    res.json({ code, phone });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bot/session-id — return the short session ID after a successful pair
botRouter.get("/bot/session-id", (_req, res) => {
  const id = getLatestSessionId();
  if (!id) {
    res.status(404).json({ error: "No session ID yet. Bot has not paired yet." });
    return;
  }
  res.json({ id, phone: getPendingPairPhone() });
});

// GET /api/bot/session/:id — fetch full session string by short ID
// Used by self-hosted bots on first boot: fetch SESSION_ID from PAIRING_SITE_URL
botRouter.get("/bot/session/:id", (req, res) => {
  const { id } = req.params;
  if (!id?.startsWith("VENOM_")) {
    res.status(400).json({ error: "Invalid session ID format" });
    return;
  }
  const session = loadSessionById(id);
  if (!session) {
    res.status(404).json({ error: "Session ID not found or expired" });
    return;
  }
  res.json({ id, session });
});

// DELETE /api/bot/session — reset session (re-pair)
botRouter.delete("/bot/session", (_req, res) => {
  import("fs").then((fs) => {
    import("path").then((path) => {
      const sessionPath = path.resolve("./session");
      try {
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        res.json({ success: true, message: "Session cleared. Bot will reconnect." });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
  });
});

export default botRouter;
