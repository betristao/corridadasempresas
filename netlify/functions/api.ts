import express, { Router } from "express";
import serverless from "serverless-http";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const router = Router();

app.use(express.json());

// API health Check
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 1. Generate Strava OAuth URL
router.get("/auth/strava/url", (req, res) => {
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
router.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
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

// On Netlify, we need to handle the base path of the function
app.use("/.netlify/functions/api", router);
app.use("/api", router);

export const handler = serverless(app);
