import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";

// Load .env first, then override with .env.local where applicable
dotenv.config();
if (fs.existsSync(".env.local")) {
  const localEnv = dotenv.parse(fs.readFileSync(".env.local"));
  for (const k in localEnv) process.env[k] = localEnv[k];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const baseUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${baseUrl}/auth/google/callback`
  );

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn("WARNING: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing. Google Drive export will not work.");
  }

  // Google Auth URL
  app.get("/api/auth/google/url", (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: "Google OAuth credentials are not configured on the server." });
    }
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      prompt: "consent",
    });
    res.json({ url });
  });

  // Google Auth Callback
  app.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      // In a real app, you'd store tokens in a session or database.
      // For this demo, we'll send them back to the client via postMessage.
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Export to Google Drive
  app.post("/api/export/drive", async (req, res) => {
    const { tokens, filename, content, mimeType } = req.body;
    if (!tokens) return res.status(401).json({ error: "Unauthorized" });

    const auth = new google.auth.OAuth2();
    auth.setCredentials(tokens);

    const drive = google.drive({ version: "v3", auth });

    try {
      const fileMetadata = {
        name: filename,
        mimeType: "application/vnd.google-apps.spreadsheet",
      };
      const media = {
        mimeType: mimeType || "text/csv",
        body: content,
      };

      const response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink",
      });

      res.json({ success: true, fileId: response.data.id, link: response.data.webViewLink });
    } catch (error) {
      console.error("Error uploading to Drive:", error);
      res.status(500).json({ error: "Failed to upload to Drive" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
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
