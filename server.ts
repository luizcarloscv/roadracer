import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Configure Web Push
const DEFAULT_PUBLIC_KEY = "BAbd49BGMQ8i7_5_2P0_pvycbNIxWT6K3FWJ7FagmQq0xezeci9EiN5yQ9DXAVml4sHIyj8CPwwreAJJXXsonfg";
const DEFAULT_PRIVATE_KEY = "Sx0DgJev0GlcFcI0Zh8VQ2XDjXepN3X35mESXP3J4A8";

const publicVapidKey = (process.env.VITE_VAPID_PUBLIC_KEY && process.env.VITE_VAPID_PUBLIC_KEY.length > 20) 
  ? process.env.VITE_VAPID_PUBLIC_KEY 
  : DEFAULT_PUBLIC_KEY;

const privateVapidKey = (process.env.VAPID_PRIVATE_KEY && process.env.VAPID_PRIVATE_KEY.length > 20)
  ? process.env.VAPID_PRIVATE_KEY
  : DEFAULT_PRIVATE_KEY;

let vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@roadracer.com";

console.log("Initializing Web Push...");
console.log("Public Key Length:", publicVapidKey.length);

// Ensure vapidEmail is a valid mailto: URI
if (vapidEmail && !vapidEmail.startsWith('mailto:') && !vapidEmail.startsWith('http')) {
  vapidEmail = `mailto:${vapidEmail}`;
}

try {
  webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
  console.log("Web Push initialized successfully.");
} catch (err) {
  console.error("Failed to initialize Web Push:", err);
  // Don't crash the whole server if push fails to init, but log it clearly
}

// API Route to serve manifest.json
app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "manifest.json"));
});

// API Route to send push notifications
app.post("/api/notify-emergency", async (req, res) => {
  const { subscriptions = [], fcmTokens = [], payload } = req.body;

  if (!payload || typeof payload !== "object") {
    return res.status(400).json({ error: "Invalid payload" });
  }

  let webPushSuccess = 0;
  let webPushFail = 0;
  let fcmSuccess = 0;
  let fcmFail = 0;

  if (Array.isArray(subscriptions) && subscriptions.length > 0) {
    console.log(`Sending WebPush to ${subscriptions.length} subscriptions...`);
    const notifications = subscriptions.map((sub, index) => {
      return webpush.sendNotification(sub, JSON.stringify(payload)).then(() => {
        webPushSuccess += 1;
        console.log(`WebPush sent to subscription ${index}`);
      }).catch(err => {
        webPushFail += 1;
        console.error(`WebPush failure on subscription ${index}:`, err);
      });
    });
    await Promise.all(notifications);
  }

  const fcmServerKey = process.env.FCM_SERVER_KEY || "";
  if (Array.isArray(fcmTokens) && fcmTokens.length > 0 && fcmServerKey) {
    console.log(`Sending FCM to ${fcmTokens.length} tokens...`);
    const fcmRequests = fcmTokens.map(async (token: string, index: number) => {
      try {
        const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `key=${fcmServerKey}`,
          },
          body: JSON.stringify({
            to: token,
            priority: "high",
            notification: {
              title: payload.title || "🚨 SOS ROAD RACER",
              body: payload.body || "Emergência detectada",
            },
            data: {
              url: payload.url || "/",
              emergency: "true",
            },
            android: {
              priority: "high",
              notification: {
                channel_id: "emergency_alerts",
                sound: "default",
              },
            },
          }),
        });

        if (fcmResponse.ok) {
          fcmSuccess += 1;
        } else {
          fcmFail += 1;
          console.error(`FCM failure for token ${index}: ${fcmResponse.status}`);
        }
      } catch (err) {
        fcmFail += 1;
        console.error(`FCM error for token ${index}:`, err);
      }
    });

    await Promise.all(fcmRequests);
  } else if (Array.isArray(fcmTokens) && fcmTokens.length > 0 && !fcmServerKey) {
    console.warn("FCM_SERVER_KEY is missing. Native push notifications were skipped.");
  }

  res.json({
    success: webPushSuccess + fcmSuccess > 0,
    webPush: { success: webPushSuccess, fail: webPushFail },
    fcm: { success: fcmSuccess, fail: fcmFail },
    warning: !fcmServerKey ? "FCM_SERVER_KEY ausente no servidor" : undefined,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Serve index.html in dev mode, but only for navigation requests
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      
      // Skip if it looks like a static file (has an extension)
      if (url.includes('.') && !url.endsWith('.html')) {
        return next();
      }

      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
