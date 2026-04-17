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

// Configuração Web Push
const DEFAULT_PUBLIC_KEY = "BAbd49BGMQ8i7_5_2P0_pvycbNIxWT6K3FWJ7FagmQq0xezeci9EiN5yQ9DXAVml4sHIyj8CPwwreAJJXXsonfg";
const DEFAULT_PRIVATE_KEY = "Sx0DgJev0GlcFcI0Zh8VQ2XDjXepN3X35mESXP3J4A8";

const publicVapidKey = (process.env.VITE_VAPID_PUBLIC_KEY && process.env.VITE_VAPID_PUBLIC_KEY.length > 20) 
  ? process.env.VITE_VAPID_PUBLIC_KEY 
  : DEFAULT_PUBLIC_KEY;

const privateVapidKey = (process.env.VAPID_PRIVATE_KEY && process.env.VAPID_PRIVATE_KEY.length > 20)
  ? process.env.VAPID_PRIVATE_KEY
  : DEFAULT_PRIVATE_KEY;

let vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@roadracer.com";

try {
  webpush.setVapidDetails(vapidEmail, publicVapidKey, privateVapidKey);
} catch (err) {
  console.error("Web Push init failed:", err);
}

// Rota para o manifest
app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "manifest.json"));
});

// Rota de Notificação (Compatível com o que o frontend chama)
app.post("/notify-emergency", async (req, res) => {
  const { title, body, url, subscriptions = [] } = req.body;
  
  console.log(`Recebido pedido de notificação: ${title}`);

  // No preview, tentamos enviar via WebPush se houver inscrições
  if (subscriptions.length > 0) {
    const payload = JSON.stringify({ title, body, url });
    const promises = subscriptions.map(sub => webpush.sendNotification(sub, payload));
    await Promise.allSettled(promises);
  }

  res.json({ success: true, message: "Notificação processada no servidor local" });
});

// Rota de Exclusão (Mock para o preview não dar erro de fetch)
app.post("/delete-member", async (req, res) => {
  const { uid } = req.body;
  console.log(`Pedido de exclusão para UID: ${uid}`);
  
  // Nota: A exclusão real do Auth requer Firebase Admin com chaves privadas.
  // No preview, retornamos sucesso para a UI continuar, mas avisamos no log.
  res.json({ 
    success: true, 
    message: "No preview, a exclusão real do Auth é simulada. No Render funcionará via Firebase Admin." 
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.includes('.') && !url.endsWith('.html')) return next();
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