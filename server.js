const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Public FiveM join code for Neverland RP.
const CFX_JOIN_CODE = process.env.CFX_JOIN_CODE || "r6dlaj";

// Static website
app.use(express.static(__dirname));

function jsonHeaders(res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.set("Access-Control-Allow-Origin", "*");
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "NeverlandRP-Website/1.0" }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/*
  Resolve the public CFX join code to the actual FiveM server endpoint.
  cfx.re/join/<code> redirects to the server's connection endpoint.
*/
async function resolveCfxJoinCode(code) {
  const joinUrl = `https://cfx.re/join/${encodeURIComponent(code)}`;

  const response = await fetch(joinUrl, {
    redirect: "manual",
    headers: { "User-Agent": "NeverlandRP-Website/1.0" }
  });

  const location = response.headers.get("location");

  if (location) {
    return location;
  }

  // Some environments may follow redirects. In that case, inspect the final URL.
  if (response.url && response.url !== joinUrl) {
    return response.url;
  }

  throw new Error("Impossible de résoudre le lien CFX.");
}

function extractEndpoint(value) {
  if (!value) return null;

  try {
    const url = new URL(value);

    // HTTP(S) endpoint
    if (url.hostname) {
      return {
        host: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        protocol: url.protocol.replace(":", "")
      };
    }
  } catch (_) {}

  // Fallback for raw host:port strings.
  const match = String(value).match(/(?:https?:\/\/)?([^/:]+)(?::(\d+))?/i);
  if (!match) return null;

  return {
    host: match[1],
    port: match[2] || 30120,
    protocol: "http"
  };
}

async function getServerStatus() {
  const resolved = await resolveCfxJoinCode(CFX_JOIN_CODE);
  const endpoint = extractEndpoint(resolved);

  if (!endpoint) {
    throw new Error("Endpoint FiveM introuvable.");
  }

  const base = `${endpoint.protocol}://${endpoint.host}:${endpoint.port}`;

  const players = await fetchJson(`${base}/players.json`);

  let info = {};
  try {
    info = await fetchJson(`${base}/info.json`);
  } catch (_) {}

  let maxPlayers = 0;

  if (info && info.vars && info.vars.sv_maxClients) {
    maxPlayers = Number(info.vars.sv_maxClients) || 0;
  }

  // Some server configurations expose max clients in other common fields.
  if (!maxPlayers && info && info.vars && info.vars.sv_maxClients) {
    maxPlayers = Number(info.vars.sv_maxClients) || 0;
  }

  return {
    online: Array.isArray(players),
    players: Array.isArray(players) ? players.length : 0,
    maxPlayers,
    joinCode: CFX_JOIN_CODE
  };
}

app.get("/api/server-status", async (req, res) => {
  jsonHeaders(res);

  try {
    const status = await getServerStatus();
    res.json(status);
  } catch (error) {
    console.error("FiveM status error:", error.message);

    res.status(200).json({
      online: false,
      players: 0,
      maxPlayers: 0,
      joinCode: CFX_JOIN_CODE,
      error: "Statut FiveM indisponible"
    });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`Neverland RP website running on port ${PORT}`);
});
