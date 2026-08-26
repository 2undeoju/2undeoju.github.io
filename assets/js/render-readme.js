/**
 * render-readme.js
 * ------------------------------------------------------------
 * Fetches this project's README.md (sitting right next to
 * index.html, exactly like a GitHub repo) and renders it into
 * the #readme-content element using the "marked" markdown
 * library loaded from a CDN in the page <head>.
 *
 * Because this uses fetch(), it needs to be served over http(s),
 * not opened directly as a file:// URL. Locally, run:
 *   python3 -m http.server 8000
 * then open http://localhost:8000/projects/<project>/
 *
 * On GitHub Pages this just works — no server setup needed.
 * ------------------------------------------------------------
 */
(function () {
  const target = document.getElementById("readme-content");
  if (!target) return;

  fetch("./README.md")
    .then((res) => {
      if (!res.ok) throw new Error("README.md not found (" + res.status + ")");
      return res.text();
    })
    .then((markdown) => {
      // marked is loaded via CDN <script> in the page head
      target.innerHTML = marked.parse(markdown);
    })
    .catch((err) => {
      target.innerHTML =
        '<p class="readme-loading">Could not load README.md. If you are viewing this ' +
        "file locally with file://, start a local server instead: " +
        "<code>python3 -m http.server</code> — then open this page via http://localhost.<br><br>" +
        "Error: " + err.message + "</p>";
    });
})();
