import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ==========================================
  // API ROUTES
  // ==========================================
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. Generate Strava OAuth URL
  app.get("/api/auth/strava/url", (req, res) => {
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const redirectUri = `${appUrl}/auth/callback`;
    
    const params = new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID || "",
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "force",
      scope: "read,activity:read",
    });

    const authUrl = `https://www.strava.com/oauth/mobile/authorize?${params.toString()}`;
    res.json({ url: authUrl });
  });

  // 2. Strava OAuth Callback Handler (Token Exchange)
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code, error } = req.query;

    if (error) {
      return res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'STRAVA_AUTH_ERROR', error: '${error}' }, '*');
              window.close();
            }
          </script>
          <p>Erro na autenticação: ${error}</p>
        </body></html>
      `);
    }

    if (!code) {
      return res.status(400).send("No code provided");
    }

    try {
      // Exchange code for access_token
      const response = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          code: code,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to exchange token");
      }

      const data = await response.json();
      
      // In a real app, we would store 'data.access_token', 'data.refresh_token', 
      // and 'data.athlete' in our database here.
      // For this prototype, we pass the athlete info back to the client.

      res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'STRAVA_AUTH_SUCCESS', 
                athlete: ${JSON.stringify(data.athlete)} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Autenticação com Strava concluída com sucesso! A redireccionar...</p>
        </body></html>
      `);
    } catch (err: any) {
      console.error("Strava Exchange Error:", err);
      res.send(`
        <html><body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'STRAVA_AUTH_ERROR', error: '${err.message}' }, '*');
              window.close();
            }
          </script>
          <p>Erro ao trocar token com Strava: ${err.message}</p>
        </body></html>
      `);
    }
  });

  // ==========================================
  // VITE MIDDLEWARE (Frontend)
  // ==========================================
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
