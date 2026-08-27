/* Vidimus v2 — geen frameworks, geen tracking. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /* ── cursor-volger ────────────────────────────────────────── */
  const cursor = $("#cursor");
  if (cursor && matchMedia("(pointer: fine)").matches) {
    let cx = -100, cy = -100, tx = -100, ty = -100;
    addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
    (function loop() {
      cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px,${cy}px)${cursor.classList.contains("hot") ? " scale(1.8)" : ""}`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", (e) => cursor.classList.toggle("hot", !!e.target.closest("a,button,[contenteditable],input")));
  }

  /* ── hash-regen op canvas (held) ──────────────────────────── */
  const canvas = $("#hashrain");
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext("2d");
    const HEX = "0123456789abcdef";
    let cols = [], fs = 14, W = 0, H = 0;
    function size() {
      const r = canvas.parentElement.getBoundingClientRect();
      W = canvas.width = r.width * devicePixelRatio;
      H = canvas.height = r.height * devicePixelRatio;
      fs = Math.max(11, Math.min(15, r.width / 90)) * devicePixelRatio;
      const n = Math.floor(W / (fs * 1.7));
      cols = [...Array(n)].map((_, i) => ({ x: i * fs * 1.7 + fs, y: Math.random() * H, v: (0.3 + Math.random() * 0.9) * devicePixelRatio }));
      ctx.font = `${fs}px "JetBrains Mono", monospace`;
    }
    size();
    addEventListener("resize", size, { passive: true });
    let last = 0;
    (function rain(t) {
      requestAnimationFrame(rain);
      if (t - last < 50) return; // ~20fps volstaat, spaart batterij
      last = t;
      ctx.fillStyle = "rgba(10,12,17,0.28)";
      ctx.fillRect(0, 0, W, H);
      cols.forEach((c) => {
        ctx.fillStyle = Math.random() < 0.015 ? "#ff3b26" : "rgba(118,125,144,0.34)";
        ctx.fillText(HEX[(Math.random() * 16) | 0], c.x, c.y);
        c.y += c.v * 26;
        if (c.y > H + fs) c.y = -fs;
      });
    })(0);
  }

  /* ── onthulling ───────────────────────────────────────────── */
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );
  $$(".rv").forEach((el) => io.observe(el));

  /* ── statement: woord per woord oplichten bij scroll ──────── */
  const stmt = $("#stmt");
  if (stmt) {
    const hot = ["woord", "tegen", "woord.", "élk", "veranderen."];
    stmt.innerHTML = stmt.textContent.split(/\s+/).map((w) =>
      `<span class="w${hot.includes(w.toLowerCase()) ? " hot" : ""}">${w}</span>`).join(" ");
    const words = $$(".w", stmt);
    if (reduceMotion) words.forEach((w) => w.classList.add("on"));
    else {
      addEventListener("scroll", () => {
        const r = stmt.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
        const n = Math.floor(p * words.length);
        words.forEach((w, i) => w.classList.toggle("on", i < n));
      }, { passive: true });
    }
  }

  /* ── de demo: vervals het ─────────────────────────────────── */
  const fields = $$("#tamperFields [data-f]");
  if (fields.length) {
    const original = fields.map((f) => f.textContent);
    const payload = () => fields.map((f) => f.textContent.trim()).join("|");
    let anchored = "", wasOk = true;
    const OK = ["OK", "OK", "OK", "OK", "OK"];
    const BAD = ["AFWIJKING", "ONGELDIG", "ONGELDIG", "GEEN DEKKING", "NIET GEVONDEN"];

    async function verify() {
      const live = await sha256(payload());
      const same = live === anchored;
      $("#liveHash").textContent = live;
      $("#liveLine").classList.toggle("bad", !same);
      const v = $("#verdict");
      v.textContent = same ? "INTACT" : "VERVALST";
      v.classList.toggle("ok", same);
      v.classList.toggle("bad", !same);
      $("#verdictSub").textContent = same
        ? "inhoud komt exact overeen met de verankerde vingerafdruk"
        : "één teken gewijzigd — en de hele verificatie breekt";
      $$("#checks [data-c]").forEach((row, i) => {
        const st = row.querySelector(".st");
        st.textContent = same ? OK[i] : BAD[i];
        st.classList.toggle("ok", same);
        st.classList.toggle("bad", !same);
      });
      fields.forEach((f, i) => f.classList.toggle("changed", f.textContent !== original[i]));
      if (!same && wasOk && !reduceMotion) {
        const doc = $("#tamperDoc");
        doc.classList.remove("shake"); void doc.offsetWidth; doc.classList.add("shake");
      }
      wasOk = same;
    }

    let deb;
    fields.forEach((f) => {
      f.addEventListener("input", () => { clearTimeout(deb); deb = setTimeout(verify, 160); });
      f.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); f.blur(); } });
      f.addEventListener("paste", (e) => {
        e.preventDefault();
        document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text").replace(/\n/g, " "));
      });
    });
    $("#tamperReset").addEventListener("click", () => { fields.forEach((f, i) => (f.textContent = original[i])); verify(); });
    sha256(payload()).then((h) => { anchored = h; $("#anchorHash").textContent = h; verify(); });
  }

  /* ── ticker: verdubbel voor naadloze lus ──────────────────── */
  const track = $("#tickerTrack");
  if (track) track.innerHTML += track.innerHTML;

  /* ── dossiers: accordeon ──────────────────────────────────── */
  $$("[data-file]").forEach((file) => {
    const head = $(".file-head", file);
    head.addEventListener("click", () => {
      const open = file.classList.contains("open");
      $$("[data-file].open").forEach((f) => { f.classList.remove("open"); $(".file-head", f).setAttribute("aria-expanded", "false"); });
      if (!open) { file.classList.add("open"); head.setAttribute("aria-expanded", "true"); }
    });
  });

  /* ── video ────────────────────────────────────────────────── */
  $$(".vplay").forEach((btn) => {
    const v = btn.parentElement.querySelector("video");
    btn.addEventListener("click", () => { btn.remove(); v.controls = true; v.play(); });
  });
  const playBtn = $("#playBtn");
  if (playBtn) {
    const video = $("#explVideo");
    playBtn.addEventListener("click", () => { playBtn.remove(); video.play(); });
    video.addEventListener("play", () => playBtn.remove(), { once: true });
  }

  /* ── rekensom — alles lokaal ──────────────────────────────── */
  if ($("#cN")) {
    const ids = ["cN", "cBedrag", "cUren", "cUurkost"];
    const eur = (n) => "€ " + Math.round(n).toLocaleString("nl-BE").replace(/ /g, " ") + ' <span class="u">/ JAAR</span>';
    function calc() {
      const [n, bedrag, uren, uurkost] = ids.map((id) => Math.max(0, parseFloat($("#" + id).value) || 0));
      $("#oTijd").innerHTML = eur(n * uren * uurkost);
      $("#oBedrag").innerHTML = eur(n * bedrag);
    }
    ids.forEach((id) => $("#" + id).addEventListener("input", calc));
    calc();
  }
})();
