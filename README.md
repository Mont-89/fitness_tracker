# Developer Portfolio (Node.js)

A clean, responsive single-page portfolio app built with **Node.js** so you can run it locally and host it publicly for recruiters and hiring teams.

## Tech stack
- Node.js
- HTML/CSS/JavaScript (frontend)

## Project structure
- `server.js` - Node server entry point
- `public/index.html` - portfolio page content
- `public/styles.css` - styling
- `public/script.js` - small client-side behavior (footer year)
- `Procfile` - process definition used by multiple hosts
- `render.yaml` - Render deployment blueprint
- `vercel.json` - Vercel routing/build config

## Run locally
1. Start the app:
   ```bash
   npm start
   ```
2. Open in your browser:
   - `http://localhost:3000`

## Easiest path: Render (recommended)
1. Push this repo to GitHub.
2. In Render, create a new **Blueprint** service.
3. Select your repo.
4. Render reads `render.yaml` and deploys automatically with:
   - runtime: `Node`
   - build: `npm install`
   - start: `npm start`
5. After deployment, you will get a public URL like:
   - `https://your-app-name.onrender.com`

## Other hosting options
### Vercel
1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Vercel will use `vercel.json` and deploy.
4. You will get a public URL like:
   - `https://your-app-name.vercel.app`

### Railway / Cyclic / other Node hosts
- This app already supports `PORT` from environment variables.
- Start command:
  ```bash
  npm start
  ```

## Customize for hiring
- Replace `Your Name`, email, and social links in `public/index.html`.
- Update each project card with your real stack, role, and measurable outcomes.
- Keep only your top projects and add links to live demos/GitHub repos.
