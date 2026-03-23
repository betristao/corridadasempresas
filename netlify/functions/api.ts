import express from "express";
import serverless from "serverless-http";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Comprehensive diagnostic headers
app.use((req, res, next) => {
  res.setHeader("X-Backend-Path", req.path);
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://www.strava.com; connect-src 'self' https://www.strava.com;");
  console.log(`[Diagnostic] Method: ${req.method}, Path: ${req.path}`);
  next();
});

app.get("/api/health", (req, res) => res.json({ status: "ok", path: req.path }));

app.get("/api/auth/strava/url", (req, res) => {
  const appUrl = process.env.APP_URL || "https://corridadasempresas.netlify.app";
  const redirectUri = `${appUrl}/api/auth/callback`; // We now prefer the /api prefix
  
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID || "",
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "force",
    scope: "read,activity:read",
  });

  res.json({ url: `https://www.strava.com/oauth/mobile/authorize?${params.toString()}` });
});

// RESILIENT CALLBACK HANDLER: Matches any path ending in /auth/callback or /callback
// This handles: /auth/callback, /api/auth/callback, /api/callback, /.netlify/functions/api/auth/callback, etc.
app.get(/(.*\/)?(auth\/)?callback/, async (req, res) => {
  const { code, error } = req.query;
  
  console.log(`[Callback Handler matched] Path: ${req.path}, Code: ${code ? 'present' : 'missing'}`);

  if (error) {
    return res.send(`<html><body><script>window.opener?.postMessage({type:'STRAVA_AUTH_ERROR',error:'${error}'},'*');window.close();</script><p>Erro: ${error}</p></body></html>`);
  }

  if (!code) {
    return res.status(400).send(`No code provided. (Path: ${req.path})`);
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
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'STRAVA_AUTH_SUCCESS', 
              athlete: ${JSON.stringify(data.athlete)} 
            }, '*');
            window.close();
          } else {
            // Fallback if not opened as popup
            localStorage.setItem('strava_athlete', '${JSON.stringify(data.athlete)}');
            window.location.href = '/?auth=success';
          }
        </script>
        <p>Sucesso! A redireccionar...</p>
      </body></html>
    `);
  } catch (err: any) {
    console.error("[Token Exchange Error]", err);
    res.send(`<html><body><script>window.opener?.postMessage({type:'STRAVA_AUTH_ERROR',error:'${err.message}'},'*');window.close();</script><p>Erro: ${err.message}</p></body></html>`);
  }
});

// Explicit 404 handler to help debug why matching failed
app.use((req, res) => {
  console.log(`[404] No match for ${req.path}`);
  res.status(404).send(`Cannot ${req.method} ${req.path} (Diagnostic: Route not found in Express)`);
});

export const handler = serverless(app);
