# Handoff for Antigravity: integrate the new IRoD homepage into the Quarto site

Claude Code (another agent) is building the new homepage in this folder right now:
`C:\Users\VinUni\Downloads\web_lab\scrollcraft\builds\irod-lab\`

**Do NOT edit any file in that folder.** Claude owns `index.html`, `site.css`, `site.js`, `scrollcraft.*`, `BRIEF.md` and `lab/`.

## Your task (independent, runs in parallel)
Prepare the lab's **Quarto source repository** (the one that renders irodlab.com, with `_quarto.yml`, `index.qmd`, `content/`, `images/`) so the new standalone homepage can replace the Quarto-rendered home page.

1. Find the Quarto project. Ask the user for its path if you do not have it open.
2. Make a new branch `homepage-scrollcraft`. Do not commit to main.
3. Add a folder `home/` at the project root as a placeholder for these files, which Claude will produce: `index.html`, `site.css`, `site.js`, `scrollcraft.css`, `scrollcraft.js`.
4. Choose and implement one of these approaches, then document it in `home/README.md`:
   - **Option A (preferred):** rename `index.qmd` to `about.qmd`, or remove it from `render`. List `home/**` under `project.resources` in `_quarto.yml`. Add a post-render step (`project.post-render` script) that copies `home/index.html` and its assets to `_site/index.html` and `_site/`. The new page uses relative paths `images/...` and `content/research/featured/<slug>/<file>.avif`, which already exist in `_site/`.
   - **Option B:** keep Quarto's `index.qmd`, but make it a raw-HTML page with `format: html: page-layout: custom` and the navbar disabled for that page only.
5. Check that the navbar links on the subpages (News, Research, People, Openings) still point to `./index.html`, and that the subpages still render with their normal Quarto chrome.
6. Run `quarto render` and confirm that `_site/index.html` survives the render, i.e. it is not overwritten by Quarto.
7. Report back to the user: the branch name, which option you chose, and the exact commands to preview (`quarto preview`).

## Facts you may need
- Site URL: https://irodlab.com (Quarto 1.10.x, Bootstrap theme, listings in `content/news` and `content/research/featured`).
- The new homepage loads Google Fonts (Archivo, IBM Plex Mono). It has no other external dependencies.
