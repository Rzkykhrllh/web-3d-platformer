import { defineConfig } from 'vite';
import { profile, items } from './src/content.js';
import { portfolioHTML, esc } from './src/render-content.js';

// Plain, game-free copy of the portfolio: served as /portfolio.html and baked into
// the <noscript> block, so search engines and screen readers get the content too.
function pageHTML() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(profile.name)} · ${esc(profile.role)}</title>
<meta name="description" content="${esc(profile.name)}, ${esc(profile.role)}. Projects, skills and contact.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@600;800&display=swap" rel="stylesheet">
<style>
  :root { --bg: #FFF8E6; --ink: #3A2412; --muted: #7A5A3C; --accent: #FFC93C; --card: #fff; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg: #1d150e; --ink: #FBEBD0; --muted: #CDAE8A; --card: #2E2116; } }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.55 "Nunito", system-ui, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 40px 16px 64px; }
  header h1 { font: 400 clamp(40px, 9vw, 64px)/1 "Lilita One", sans-serif; margin: 0; }
  header p { margin: 6px 0 0; font-weight: 800; color: var(--muted); }
  h2 { font: 400 28px "Lilita One", sans-serif; margin: 40px 0 12px; }
  h3 { font: 400 22px/1.2 "Lilita One", sans-serif; margin: 2px 0 6px; }
  article { background: var(--card); border-radius: 12px; padding: 16px 18px 6px; margin: 0 0 12px; box-shadow: 0 2px 0 rgba(0,0,0,.08); }
  .kind { font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; padding: 0; list-style: none; }
  .tags li { padding: 2px 10px; border-radius: 999px; background: rgba(184,116,47,.16); font-size: 13px; font-weight: 800; }
  .links { display: flex; flex-wrap: wrap; gap: 8px; }
  .links a, .play { padding: 6px 12px; border-radius: 8px; background: var(--accent); color: #2B1A0F; font-weight: 800; text-decoration: none; }
  .play { display: inline-block; margin-top: 16px; }
</style>
</head>
<body><main>${portfolioHTML(profile, items)}<p><a class="play" href="./">Play the island version</a></p></main></body>
</html>`;
}

function staticPortfolio() {
  return {
    name: 'static-portfolio',
    transformIndexHtml(html) {
      return html.replace('<main class="static" id="static"></main>', `<main class="static" id="static">${portfolioHTML(profile, items)}</main>`);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/portfolio.html')) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(pageHTML());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'portfolio.html', source: pageHTML() });
    }
  };
}

export default defineConfig({
  // Served at game.byairu.com/island. Absolute paths, so /island works
  // without a trailing slash. BASE_PATH=/ npm run build for a root deploy.
  base: process.env.BASE_PATH || '/island/',
  // 3000 is taken by other local work; if 4000 is busy too, Vite moves on to 4001, 4002, ...
  server: { port: 4000 },
  plugins: [staticPortfolio()]
});
