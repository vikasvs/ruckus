import express, { type NextFunction, type Request, type Response } from 'express';
import type { AppDependencies } from './app-dependencies';
import { createUsersRouter } from './routes/users';
import { createGroupsRouter, loadInvitePreview } from './routes/groups';
import { createStatusRouter } from './routes/status';
import cors from 'cors';
import { createRecoveryRouter } from './routes/recovery';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function createApp(deps: AppDependencies) {
  const app = express();

  // Chrome Private Network Access: must be set before CORS preflight.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
  });

  app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Request-Private-Network'],
  }));

  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/j/:token', async (req: Request, res: Response) => {
    try {
      const preview = await loadInvitePreview(deps.pool, req.params.token);

      if (!preview) {
        res.status(404).type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Invite not found | Ruckus</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0d0b14; color: #f7f3ff; display: grid; min-height: 100vh; place-items: center; }
      main { max-width: 420px; padding: 32px; text-align: center; }
      a { color: #ff6b54; }
    </style>
  </head>
  <body>
    <main>
      <h1>That Ruckus invite is gone.</h1>
      <p>Ask your crew for a fresh link or invite code.</p>
    </main>
  </body>
</html>`);
        return;
      }

      const heatCount = preview.active_rucked_count + preview.active_ricked_count;
      const emoji = preview.group.identity?.emoji ?? '⚡';
      const tagline = preview.group.identity?.tagline ?? 'The crew is live.';
      const deepLink = `ruckus://j/${encodeURIComponent(preview.invite_link.token)}`;
      const title = `${emoji} Join ${preview.group.name} on Ruckus`;
      const description = `${preview.member_count} members, ${heatCount} live right now.`;

      res.type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta name="description" content="${escapeHtml(description)}" />
    <style>
      :root {
        color-scheme: dark;
        --bg: radial-gradient(circle at top, #2d1d47 0%, #0b0912 58%, #050409 100%);
        --card: rgba(17, 13, 26, 0.88);
        --line: rgba(255, 255, 255, 0.12);
        --text: #f5efff;
        --muted: #c8b9dd;
        --accent: #ff6b54;
        --accent-2: #ffb36a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        background: var(--bg);
        color: var(--text);
        display: grid;
        place-items: center;
        padding: 24px;
      }
      main {
        width: min(100%, 460px);
        background: var(--card);
        border: 1px solid var(--line);
        border-radius: 28px;
        padding: 32px;
        box-shadow: 0 20px 80px rgba(0,0,0,0.38);
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.05);
        color: var(--muted);
        font-size: 13px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      h1 {
        margin: 18px 0 10px;
        font-size: 34px;
        line-height: 1.08;
      }
      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin: 24px 0;
      }
      .stat {
        padding: 14px 12px;
        border-radius: 18px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .stat strong {
        display: block;
        font-size: 22px;
      }
      .stat span {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .buttons {
        display: grid;
        gap: 12px;
        margin-top: 28px;
      }
      .btn {
        appearance: none;
        border: 0;
        border-radius: 16px;
        padding: 16px 18px;
        text-decoration: none;
        color: #0d0811;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        font-weight: 700;
        text-align: center;
      }
      .btn.secondary {
        color: var(--text);
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .code {
        margin-top: 20px;
        font-family: ui-monospace, SFMono-Regular, monospace;
        letter-spacing: 0.18em;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="eyebrow">${escapeHtml(emoji)} Private invite</div>
      <h1>${escapeHtml(preview.group.name)}</h1>
      <p>${escapeHtml(tagline)}</p>
      <div class="stats">
        <div class="stat"><strong>${preview.member_count}</strong><span>Members</span></div>
        <div class="stat"><strong>${heatCount}</strong><span>Live now</span></div>
        <div class="stat"><strong>${preview.active_rucked_count}</strong><span>Rucked</span></div>
      </div>
      <p>${escapeHtml(description)}</p>
      <div class="buttons">
        <a class="btn" href="${escapeHtml(deepLink)}">Open in Ruckus</a>
        <a class="btn secondary" href="https://apps.apple.com/app/id6760951487">Get the app</a>
      </div>
      <p class="code">Invite code: ${escapeHtml(preview.group.invite_code)}</p>
    </main>
  </body>
</html>`);
    } catch (error: any) {
      res.status(500).type('html').send(`<h1>Something went wrong</h1><p>${escapeHtml(error.message)}</p>`);
    }
  });

  app.use('/api/recovery', createRecoveryRouter(deps));
  app.use('/api/users', createUsersRouter(deps));
  app.use('/api/groups', createGroupsRouter(deps));
  app.use('/api/status', createStatusRouter(deps));

  return app;
}
