/**
 * arch.js — the AI Service Layer architecture, walked one request at a time.
 * Renders into any element with [data-arch]. Plays when scrolled into view,
 * pauses on interaction, and never auto-plays when reduced motion is requested.
 */
(function () {
  var STEPS = [
    { on: ["clients", "api"], title: "Capability API",
      text: "Any app calls the same contract with one of five verbs: ask, find, plan, recommend, assess. A new app becomes a client, not a new project." },
    { on: ["gate"], title: "Policy gate",
      text: "Identity, purpose and the verb are checked first, and the gate fails closed. An unknown token or a forbidden verb never reaches a model." },
    { on: ["context"], title: "Context resolver",
      text: "Granted scopes become the only places the layer may look, and one token budget is split across them. Permission and personalisation are the same mechanism." },
    { on: ["retrieval", "tools", "store", "sources"], title: "Retrieval and tools, in parallel",
      text: "Stable knowledge is searched with BM25 and vectors, fused with RRF and reranked, with the access filter inside the SQL. Live records such as credits and timetables are called through tools over MCP and never embedded." },
    { on: ["gateway"], title: "Model gateway",
      text: "Each task is routed to a model tier and its cost is recorded. The model classifies and writes the prose; it never selects a course or computes a number." },
    { on: ["ground"], title: "Groundedness gate",
      text: "Every claim needs a citation and every number must match a tool result. If anything fails, the whole answer is refused rather than trimmed." },
    { on: ["store"], title: "Trace and replay",
      text: "Each stage is timed, costed and stored as one trace. A recorded run replays to the identical answer, so an incident can be debugged offline." }
  ];

  var TEMPLATE =
    '<div class="arch-board">' +
      '<div class="arch-band" data-n="clients"><b>Any app</b> — student portal, LMS, mobile app; staff and public tools later with different scopes, not a different build</div>' +
      '<div class="arch-flow">' +
        '<span class="arch-flow-label">AI service layer</span>' +
        '<div class="arch-col"><div class="arch-node" data-n="api"><b>Capability API</b><span>one contract</span></div></div>' +
        '<div class="arch-col"><div class="arch-node" data-n="gate"><b>Policy gate</b><span>identity · purpose</span></div></div>' +
        '<div class="arch-col"><div class="arch-node" data-n="context"><b>Context resolver</b><span>scopes · budget</span></div></div>' +
        '<div class="arch-col pair">' +
          '<div class="arch-node" data-n="retrieval"><b>Retrieval</b><span>hybrid · rerank</span></div>' +
          '<div class="arch-node" data-n="tools"><b>Tools</b><span>MCP · live · exact</span></div>' +
        '</div>' +
        '<div class="arch-col"><div class="arch-node" data-n="gateway"><b>Model gateway</b><span>routed · EU-hosted</span></div></div>' +
        '<div class="arch-col"><div class="arch-node" data-n="ground"><b>Groundedness</b><span>cite or refuse</span></div></div>' +
      '</div>' +
      '<div class="arch-under">' +
        '<div class="arch-band" data-n="store"><b>PostgreSQL</b> — chunks, embeddings, BM25 index, access lists and traces in one store</div>' +
        '<div class="arch-band" data-n="sources"><b>Source systems</b> — called live, never stored</div>' +
      '</div>' +
    '</div>' +
    '<figcaption class="arch-caption" aria-live="polite">' +
      '<div><h3 data-r="title"></h3><p data-r="text"></p></div>' +
      '<span class="arch-count" data-r="count"></span>' +
    '</figcaption>' +
    '<div class="arch-controls">' +
      '<button type="button" class="arch-toggle" data-r="toggle"></button>' +
      '<div class="arch-pips" role="group" aria-label="Request stages" data-r="pips"></div>' +
      '<span class="arch-outcomes"><code class="s-ok">200</code> answered · <code class="s-refuse">422</code> refused · <code class="s-deny">403</code> denied</span>' +
    '</div>';

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DWELL = 5200;

  document.querySelectorAll("[data-arch]").forEach(function (root) {
    root.innerHTML = TEMPLATE;
    root.classList.add("arch");
    var q = function (r) { return root.querySelector('[data-r="' + r + '"]'); };
    var nodes = root.querySelectorAll("[data-n]");
    var pips = q("pips"), toggle = q("toggle");
    var i = 0, timer = null, playing = false, visible = false, userPaused = reduce;

    STEPS.forEach(function (s, k) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "arch-pip"; b.textContent = k + 1;
      b.setAttribute("aria-label", "Stage " + (k + 1) + ": " + s.title);
      b.addEventListener("click", function () { userPaused = true; stop(); show(k); });
      pips.appendChild(b);
    });

    function show(k) {
      i = k;
      var s = STEPS[k];
      root.classList.add("is-running");
      var done = [];
      if (k < STEPS.length - 1) for (var j = 0; j < k; j++) done = done.concat(STEPS[j].on);
      nodes.forEach(function (n) {
        var id = n.getAttribute("data-n"), on = s.on.indexOf(id) > -1;
        n.classList.toggle("is-on", on);
        n.classList.toggle("is-done", !on && done.indexOf(id) > -1);
      });
      q("title").textContent = s.title;
      q("text").textContent = s.text;
      q("count").textContent = "Stage " + (k + 1) + " of " + STEPS.length;
      pips.querySelectorAll(".arch-pip").forEach(function (p, j) {
        if (j === k) p.setAttribute("aria-current", "step"); else p.removeAttribute("aria-current");
      });
    }
    function label() { toggle.textContent = playing ? "Pause" : "Play"; }
    function start() {
      if (playing) return;
      playing = true; label();
      timer = setInterval(function () { show((i + 1) % STEPS.length); }, DWELL);
    }
    function stop() { playing = false; clearInterval(timer); label(); }

    toggle.addEventListener("click", function () {
      if (playing) { userPaused = true; stop(); }
      else { userPaused = false; show((i + 1) % STEPS.length); start(); }
    });

    show(0); label();

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !userPaused) start(); else if (!visible) stop();
      }, { threshold: 0.45 }).observe(root);
    } else if (!userPaused) { start(); }
  });
})();
