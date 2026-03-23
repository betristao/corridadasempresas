import express from "express";
import serverless from "serverless-http";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Security headers as a fallback
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://www.strava.com; connect-src 'self' https://www.strava.com;");
  next();
});

// Log requests
app.use((req, res, next) => {
  console.log(`[API Request] ${req.method} ${req.path}`);
  next();
});

// Routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/auth/strava/url", (req, res) => {
  const appUrl = process.env.APP_URL || "https://corridadasempresas.netlify.app";
  const redirectUri = `${appUrl}/api/auth/callback`;
  
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "force",
    scope: "read,activity:read",
  });

  res.json({ url: `https://www.strava.com/oauth/mobile/authorize?${params.toString()}` });
});

// Handle BOTH path possibilities after Netlify redirect
app.get(["/auth/callback", "/api/auth/callback"], async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.send(`<html><body><script>window.opener?.postMessage({type:'STRAVA_AUTH_ERROR',error:'${error}'},'*');window.close();</script><p>Erro: ${error}</p></body></html>`);
  }

  if (!code) {
    return res.status(400).send("No code provided by Strava");
  }

  try {
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Token exchange failed");

    res.send(`
      <html><body>
        <script>
          window.opener?.postMessage({ 
            type: 'STRAVA_AUTH_SUCCESS', 
            athlete: ${JSON.stringify(data.athlete)} 
          }, '*');
          window.close();
        </script>
        <p>Sucesso! A redireccionar...</p>
      </body></html>
    `);
  } catch (err: any) {
    res.send(`<html><body><script>window.opener?.postMessage({type:'STRAVA_AUTH_ERROR',error:'${err.message}'},'*');window.close();</script><p>Erro: ${err.message}</p></body></html>`);
  }
});

export const handler = serverless(app);
