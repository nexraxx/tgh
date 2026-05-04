const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// ---------------- ENV ----------------
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log("Missing ENV:");
  console.log("CLIENT_ID =", CLIENT_ID);
  console.log("CLIENT_SECRET =", CLIENT_SECRET);
  throw new Error("Missing CLIENT_ID or CLIENT_SECRET");
}

// ---------------- APP ----------------
const app = express();
const PORT = 9000;

// ---------------- MIDDLEWARE ----------------
app.use(express.json());

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(session({
  secret: "ticket-aid-secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ---------------- DISCORD OAUTH ----------------
passport.use(new DiscordStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  callbackURL: `http://localhost:${PORT}/auth/discord/callback`,
  scope: ["identify", "guilds"]
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// ---------------- DATA ----------------
async function readData() {
  try {
    return JSON.parse(await fs.readFile("data.json", "utf-8"));
  } catch {
    return { guilds: {}, blacklist: [] };
  }
}

async function saveData(data) {
  await fs.writeFile("data.json", JSON.stringify(data, null, 2));
}

// ---------------- ROUTES ----------------

// LOGIN
app.get("/auth/discord", passport.authenticate("discord"));

// CALLBACK
app.get("/auth/discord/callback",
  passport.authenticate("discord", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("http://localhost:5173/dashboard");
  }
);

// USER INFO
app.get("/api/user", (req, res) => {
  res.json(req.user || null);
});

// USER GUILDS
app.get("/api/guilds", (req, res) => {
  if (!req.user) return res.json([]);

  const guilds = req.user.guilds.filter(g =>
    (g.permissions & 0x20) === 0x20
  );

  res.json(guilds);
});

// GET CONFIG
app.get("/api/config/:guildId", async (req, res) => {
  const data = await readData();
  res.json(data.guilds[req.params.guildId] || {});
});

// UPDATE CONFIG
app.post("/api/config/:guildId", async (req, res) => {
  const data = await readData();

  if (!data.guilds[req.params.guildId]) {
    data.guilds[req.params.guildId] = {
      ticketCategory: null,
      staffRole: null,
      transcriptChannel: null,
      counter: 0,
      tickets: []
    };
  }

  data.guilds[req.params.guildId] = {
    ...data.guilds[req.params.guildId],
    ...req.body
  };

  await saveData(data);

  res.json({ success: true });
});

// ---------------- START ----------------
app.listen(PORT, () => {
  console.log(`🚀 Dashboard running on http://localhost:${PORT}`);
});