# Portfolio site — Akintunde Ojutiku

A simple, dependency-free portfolio site: plain HTML/CSS/JS, no build step, ready to
push straight to GitHub Pages. Layout is inspired by clean academic profile pages
(photo + contact block + bio + timeline), kept minimal on purpose.

## Structure

```
index.html              → About / CV page (hero, experience, education, skills)
projects.html            → Project grid, links into each project page
projects/<slug>/
  index.html              → Page chrome: title, tags, GitHub link, optional live-demo iframe
  README.md               → The actual content — edit this like any GitHub README
  media/                   → Put screenshots, GIFs, videos here, reference them from README.md
assets/
  css/style.css            → All styling, one file
  js/render-readme.js       → Fetches README.md and renders it into the page
  js/main.js                → Small nav helper
  cv/Ojutiku_CV.pdf         → Downloadable CV (linked from the top nav)
  img/avatar.jpg            → Profile photo
```

## How project pages work

Each project folder has an `index.html` (the page frame: title, tags, GitHub/demo
buttons) and a `README.md` (the actual write-up). The page fetches `README.md` at load
time and renders it with [marked](https://github.com/markedjs/marked), the same way
GitHub renders a repo's README — so to update a project's content you just edit
`README.md`, no HTML required.

**Adding images or video** — put the file in that project's `media/` folder and
reference it from `README.md` with normal markdown/HTML:

```markdown
![Screenshot](media/screenshot.png)
<video controls src="media/demo.mp4" style="max-width:100%"></video>
```

**Embedding a running frontend/demo** — open that project's `index.html` and look for
the `<!-- OPTIONAL: embed a running frontend/demo -->` comment block. Uncomment it and
point `src` at your deployed app's URL. Some sites refuse to be embedded in an iframe
(`X-Frame-Options`); if the demo doesn't load, just keep the **Live Demo** button linking
out instead.

## Adding a new project

1. Copy an existing folder, e.g. `projects/tinystories/` → `projects/my-new-project/`
2. Edit the `<title>`, breadcrumb text, `<h1>`, tagline, tags, and GitHub link inside
   `index.html`
3. Replace the content of `README.md` with the real write-up
4. Add a card for it in `projects.html` (copy one `<article class="project-card">` block)

## Before you publish — replace these placeholders

- `https://github.com/YOUR-GITHUB-USERNAME` — your GitHub profile (in `index.html`) and
  each project's repo link (in every `projects/*/index.html`)
- `https://www.linkedin.com/in/YOUR-LINKEDIN` — your LinkedIn, or delete that button
- Each project's `README.md` — currently scaffolded with placeholder sections
  (`> Replace this paragraph...`) for you to fill in with real content
- `assets/cv/Ojutiku_CV.pdf` — swap in a newer CV export whenever you update it, filename
  can stay the same so the link in `index.html` keeps working

## Run it locally

Project pages fetch `README.md` via JavaScript, which browsers block over a plain
`file://` URL. Serve the folder instead:

```bash
cd portfolio-site
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `your-username.github.io` for a root-domain site, or
   any repo name for a project site)
2. Push this folder's contents to that repo's `main` branch
3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch → Branch: `main` / `(root)`**
4. GitHub gives you a URL within a minute or two — `https://your-username.github.io/` (or
   `.../repo-name/` for a project repo)

Every future `git push` redeploys the site automatically — no extra CI config needed.
