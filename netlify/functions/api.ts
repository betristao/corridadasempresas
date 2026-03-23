import express from "express";
import serverless from "serverless-http";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Log requests for debugging (will show up in Netlify logs)
app.use((req, res, next) => {
  console.log(`[Backend Request] ${req.method} ${req.path}`);
  next();
});

// API health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 1. Generate Strava OAuth URL
app.get("/api/auth/strava/url", (req, res) => {
  const appUrl = process.env.APP_URL || "";
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
// We handle both /auth/callback and /api/auth/callback just in case
app.get(["/auth/callback", "/api/auth/callback"], async (req, res) => {
  const { code, error } = req.query;

  console.log(`[Strava Callback] code=${code ? 'present' : 'missing'}, error=${error || 'none'}`);

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

// Final catch-all for debugging
app.use((req, res) => {
  console.log(`[404] No route matched for ${req.path}`);
  res.status(404).send(`Cannot ${req.method} ${req.path}`);
});

export const handler = serverless(app);
