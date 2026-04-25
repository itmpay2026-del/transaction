require("dotenv").config();
const express = require("express");
const path = require("path");
const http = require("http");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require('mongodb-memory-server');
const db = require("./config/database");
const authRoutes = require("./routes/auth-sqlite");
const walletRoutes = require("./routes/wallet-sqlite");
const chatDisputesRoutes = require("./chat/disputes");
const chatUserRoutes = require("./chat/user");
const chatWebhookRoutes = require("./chat/webhook");
const chatFraudscoreRoutes = require("./chat/fraudscore-route");
const chatSocketConfig = require("./chat/socket");

const app = express();
const server = http.createServer(app);
const io = chatSocketConfig(server);

// Start MongoDB Memory Server
let mongoServer;
let mongoConnected = false;

async function startMongoDB() {
  try {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('MongoDB Memory Server connected');
    mongoConnected = true;
  } catch (err) {
    console.error('MongoDB Memory Server connection error:', err);
    console.log('Running without MongoDB - chat services will be unavailable');
  }
}

startMongoDB();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Store io instance in app for access in routes
app.set('io', io);

// SQLite database is automatically initialized
app.use("/auth", authRoutes);
app.use("/wallet", walletRoutes);

// Chat module integrations
app.use("/chat/disputes", chatDisputesRoutes);
app.use("/chat/user", chatUserRoutes);
app.use("/chat/webhook", chatWebhookRoutes);
app.use("/chat/fraudscore", chatFraudscoreRoutes);

// Services page route
app.get("/services", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "services.html"));
});

// Dashboard route
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

// Root route serves services page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "services.html"));
});

// Redirects for vanity URLs mapping to original routes
app.get("/authentication", (req, res) => res.redirect("/"));
app.get("/disputes", (req, res) => res.redirect("/chat/disputes"));
app.get("/user-profile", (req, res) => res.redirect("/chat/user"));
app.get("/fraud-detection", (req, res) => res.redirect("/chat/fraudscore"));
app.get("/webhooks", (req, res) => res.redirect("/chat/webhook"));
app.get("/live-chat", (req, res) => res.redirect("/chat.html"));

// Serve the dashboard for any unknown route (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));