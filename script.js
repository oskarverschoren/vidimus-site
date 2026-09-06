/* Vidimus — site in de huisstijl van de app. Geen frameworks, geen tracking. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /* ── hash die vastklikt: teken voor teken, zoals de hash-plate in de app ── */
  const lockTimers = new WeakMap();
  function lockHash(el, hex, stepMs = 7) {
    el.dataset.copy = hex;
    el.title = "klik om de volledige hash te kopiëren";
    if (reduceMotion) { el.textContent = hex; return; }
    clearTimeout(lockTimers.get(el));
    el.replaceChildren(...[...hex].map((ch) => { const i = document.createElement("i"); i.textContent = ch; return i; }));
    const spans = $$("i", el);
    let k = 0;
    (function tick() {
      for (let n = 0; n < 2 && k < spans.length; n++) spans[k++].classList.add("on");
      if (k < spans.length) lockTimers.set(el, setTimeout(tick, stepMs));
    })();
  }

  /* ── hash-regen op canvas (held): inkt op 8 % over de lichte achtergrond ── */
  const canvas = $("#hashrain");
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext("2d");
    const HEX = "0123456789abcdef";
    const TRAIL = 14;
    let cols = [], fs = 14, W = 0, H = 0, dpr = 1;
    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
      const r = canvas.parentElement.getBoundingClientRect();
      W = canvas.width = Math.round(r.width * dpr);
      H = canvas.height = Math.round(r.height * dpr);
      fs = Math.max(11, Math.min(15, r.width / 90)) * dpr;
      const n = Math.floor(W / (fs * 1.9));
      cols = [...Array(n)].map((_, i) => ({ x: i * fs * 1.9 + fs, y: Math.random() * H, v: 0.35 + Math.random() * 0.9, glyphs: [...Array(TRAIL)].map(() => HEX[(Math.random() * 16) | 0]) }));
      ctx.font = `${fs}px "JetBrains Mono", monospace`;
    }
    size();
    addEventListener("resize", size, { passive: true });
    let last = 0;
    (function rain(t) {
      requestAnimationFrame(rain);
      if (t - last < 50) return; // ~20 fps volstaat, spaart batterij
      last = t;
      ctx.clearRect(0, 0, W, H);
      const step = fs * 1.25;
      cols.forEach((c) => {
        c.glyphs.pop(); c.glyphs.unshift(HEX[(Math.random() * 16) | 0]);
        for (let i = 0; i < TRAIL; i++) {
          const y = c.y - i * step;
          if (y < -fs || y > H + fs) continue;
          const a = 0.08 * (1 - i / TRAIL);
          ctx.fillStyle = i === 0 && Math.random() < 0.02 ? `rgba(30,79,216,${Math.max(a, 0.22)})` : `rgba(11,15,23,${a})`;
          ctx.fillText(c.glyphs[i], c.x, y);
        }
        c.y += c.v * step;
        if (c.y - TRAIL * step > H) c.y = -fs;
      });
    })(0);
  }

  /* ── tickerband: live ankers ─────────────────────────────────
     Contract: GET https://app.vidimus.be/public/ticker → JSON
       [ { kind: "CMR", plaats: "Antwerpen", tijd: "2026-09-05T14:32:07Z" | "14:32:07", hash: "<hex>" }, … ]
       (een object met een veld `items` of `ankers` dat zo'n array bevat, mag ook)
     Geen antwoord, fout of leeg → 8 voorbeeldrijen, class "demo", label "voorbeeld". */
  const track = $("#anchorTrack");
  if (track) {
    const ENDPOINT = "https://app.vidimus.be/public/ticker";
    const MAX_ROWS = 12, TIMEOUT_MS = 4000, REFRESH_MS = 90000, PX_PER_S = 48;
    const SAMPLE = [
      { kind: "CMR", plaats: "Antwerpen", tijd: "14:32:07", hash: "3f9a" },
      { kind: "FOTO", plaats: "Zeebrugge", tijd: "14:29:51", hash: "b81c" },
      { kind: "OVERDRACHT", plaats: "Gent", tijd: "14:21:18", hash: "07d4" },
      { kind: "CMR", plaats: "Antwerpen", tijd: "14:12:40", hash: "e5a2" },
      { kind: "SENSOR", plaats: "Luik", tijd: "14:00:03", hash: "9c1b" },
      { kind: "CMR", plaats: "Genk", tijd: "13:47:26", hash: "42f7" },
      { kind: "FOTO", plaats: "Antwerpen", tijd: "13:38:09", hash: "d6e0" },
      { kind: "CMR", plaats: "Roeselare", tijd: "13:31:55", hash: "1a8f" },
    ];
    const clean = (v, n) => String(v == null ? "" : v).replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, n);
    const fmtTime = (t) => {
      const s = clean(t, 40);
      if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
      const d = new Date(s);
      return isNaN(d) ? s.slice(0, 8) : d.toLocaleTimeString("nl-BE", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Brussels" });
    };
    const row = (a, demo) => {
      const el = document.createElement("span");
      el.className = "ab-row" + (demo ? " demo" : "");
      const kind = document.createElement("b"); kind.textContent = clean(a.kind, 14).toUpperCase();
      const place = document.createElement("span"); place.textContent = clean(a.plaats, 24) || "—";
      const time = document.createElement("time"); time.textContent = fmtTime(a.tijd);
      const hash = document.createElement("code"); hash.className = "vd-hash";
      const full = clean(a.hash, 128).replace(/[^0-9a-f]/gi, "").toLowerCase();
      hash.textContent = (full.slice(0, 4) || "····") + "…";
      if (full.length >= 16) { hash.dataset.copy = full; hash.title = "klik om de volledige hash te kopiëren"; }
      const sep = () => { const i = document.createElement("i"); i.textContent = "·"; return i; };
      el.append(kind, sep(), place, sep(), time, sep(), hash);
      return el;
    };
    function render(list, demo) {
      track.replaceChildren(...list.map((a) => row(a, demo)));
      const w = track.scrollWidth; // verdubbel voor een naadloze lus, snelheid uit de breedte
      $$(".ab-row", track).forEach((r) => track.append(r.cloneNode(true)));
      track.style.setProperty("--ab-dur", `${Math.max(20, Math.round(w / PX_PER_S))}s`);
      $("#anchorNote").hidden = !demo;
      $("#anchorband").classList.toggle("is-demo", demo);
      $(".ab-lbl", $("#anchorband")).lastChild.textContent = demo ? "ANKERS · VOORBEELD" : "ANKERS · LIVE";
    }
    async function load() {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(ENDPOINT, { signal: ctrl.signal, cache: "no-store", headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`ticker ${res.status}`);
        const json = await res.json();
        const arr = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : Array.isArray(json?.ankers) ? json.ankers : [];
        const rows = arr.filter((a) => a && typeof a === "object" && a.kind && a.hash).slice(0, MAX_ROWS);
        if (!rows.length) throw new Error("ticker leeg");
        render(rows, false);
        return true;
      } catch (err) {
        if (!track.childElementCount) render(SAMPLE, true); // eerste keer: voorbeeld tonen; nadien oude rijen laten staan
        return false;
      } finally { clearTimeout(timer); }
    }
    load();
    setInterval(() => { if (document.visibilityState === "visible") load(); }, REFRESH_MS);
  }

  /* ── hash kopiëren (band + demo) ──────────────────────────── */
  document.addEventListener("click", (e) => {
    const el = e.target.closest(".vd-hash[data-copy]");
    if (!el || !navigator.clipboard) return;
    navigator.clipboard.writeText(el.dataset.copy).then(() => {
      el.classList.add("copied"); setTimeout(() => el.classList.remove("copied"), 900);
    }).catch(() => {});
  });

  /* ── onthulling bij scrollen ──────────────────────────────── */
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
  );
  $$(".rv").forEach((el) => io.observe(el));

  /* ── de demo: vervals het ─────────────────────────────────────
     Twee uitkomsten, nooit een oordeel: IDENTIEK of ONBEKEND. */
  const fields = $$("#tamperFields [data-f]");
  if (fields.length) {
    const ANCHOR_AT = "04.09.2026 15:13:22Z";
    const original = fields.map((f) => f.textContent);
    const payload = () => fields.map((f) => f.textContent.trim()).join("|");
    let anchored = "", wasSame = true;

    async function verify() {
      const live = await sha256(payload());
      const same = live === anchored;
      const liveEl = $("#liveHash");
      lockHash(liveEl, live, same ? 7 : 4);
      liveEl.classList.toggle("match", same);
      const v = $("#verdict");
      v.textContent = same ? "IDENTIEK" : "ONBEKEND";
      v.classList.toggle("ok", same);
      v.classList.toggle("bad", !same);
      $("#verdictSub").textContent = same
        ? `Vingerafdruk komt overeen met anker van ${ANCHOR_AT}`
        : "Vingerafdruk komt met geen enkel anker overeen";
      const st = $("#ladeSt");
      st.textContent = same ? "IDENTIEK" : "ONBEKEND";
      st.classList.toggle("ok", same);
      st.classList.toggle("bad", !same);
      const naamVan = (f) => (f.dataset.f || f.previousElementSibling?.textContent || f.closest("div,tr,li")?.querySelector("dt,.k,.lbl")?.textContent || "veld").trim().toLowerCase();
      const gewijzigd = fields.filter((f, i) => f.textContent !== original[i]).map(naamVan).join(", ") || "—";
      $$("#checks [data-c]").forEach((row) => {
        const s = row.querySelector(".st");
        s.textContent = same ? "IDENTIEK" : "ONBEKEND";
        s.classList.toggle("ok", same);
        s.classList.toggle("bad", !same);
        const ok = row.querySelector("[data-ok]"), bad = row.querySelector("[data-bad]");
        if (ok && bad) { ok.hidden = !same; bad.hidden = same; if (!bad.dataset.tpl) bad.dataset.tpl = bad.textContent; bad.textContent = bad.dataset.tpl.replace("{velden}", gewijzigd); }
      });
      fields.forEach((f, i) => f.classList.toggle("changed", f.textContent !== original[i]));
      if (!same && wasSame && !reduceMotion) {
        const doc = $("#tamperDoc");
        doc.classList.remove("shake"); void doc.offsetWidth; doc.classList.add("shake");
      }
      wasSame = same;
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
    sha256(payload()).then((h) => {
      anchored = h;
      lockHash($("#anchorHash"), h, 9);
      verify();
    });
  }

  /* ── schermafbeeldingen: nette plaatshouder tot de beelden er zijn ── */
  $$(".shot-frame img").forEach((img) => {
    const missing = () => img.parentElement.classList.add("missing");
    if (img.complete && img.naturalWidth === 0) missing();
    img.addEventListener("error", missing, { once: true });
  });

  /* ── video ────────────────────────────────────────────────── */
  $$(".vplay").forEach((btn) => {
    const v = btn.parentElement.querySelector("video");
    btn.addEventListener("click", () => { btn.remove(); v.controls = true; v.play(); });
  });

  /* ── rekensom — alles lokaal ──────────────────────────────── */
  if ($("#cN")) {
    const ids = ["cN", "cBedrag", "cUren", "cUurkost"];
    const eur = (n) => "€\u00a0" + Math.round(n).toLocaleString("nl-BE").replace(/[ .]/g, "\u00a0") + ' <span class="u">/ JAAR</span>';
    function calc() {
      const [n, bedrag, uren, uurkost] = ids.map((id) => Math.max(0, parseFloat($("#" + id).value) || 0));
      $("#oTijd").innerHTML = eur(n * uren * uurkost);
      $("#oBedrag").innerHTML = eur(n * bedrag);
    }
    ids.forEach((id) => $("#" + id).addEventListener("input", calc));
    calc();
  }
})();

/* ── scroll-reveal voor .rv (eenmalig; zonder dit bleef alles onder de hero onzichtbaar) ── */
(function () {
  const els = document.querySelectorAll(".rv");
  const toon = (el) => el.classList.add("is-in");
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) { els.forEach(toon); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { toon(e.target); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach((el) => io.observe(el));
  setTimeout(() => els.forEach(toon), 6000);   // vangnet: na zes seconden staat alles hoe dan ook
})();

/* begin uw stroom: de stroomnaam reist mee naar de wizard (next=/onboarding?naam=…) */
(function () { const f = document.getElementById("startForm"); if (!f) return; f.addEventListener("submit", () => { const n = document.getElementById("startNaam").value.trim(); document.getElementById("startNext").value = "/onboarding" + (n ? "?naam=" + encodeURIComponent(n) : ""); }); })();

/* samenvatting op de ingeklapte controles: 6 × identiek / n × onbekend, volgt de demo */
(function () {
  const sum = document.getElementById("zesSum"); if (!sum) return;
  const upd = () => { const bad = document.querySelectorAll("#checks .st.bad").length; sum.textContent = bad ? `${bad} × onbekend` : "6 × identiek"; sum.classList.toggle("bad", bad > 0); };
  new MutationObserver(upd).observe(document.getElementById("checks"), { subtree: true, childList: true, characterData: true, attributes: true }); upd();
})();

/* controles in de demo: klik = uitleg open (waarom identiek / waarom niet) */
document.querySelectorAll("#checks .checkrow.klik").forEach((row) => {
  const toggle = () => { const d = row.querySelector(".chk-uitleg"); d.hidden = !d.hidden; row.classList.toggle("open", !d.hidden); row.setAttribute("aria-expanded", String(!d.hidden)); };
  row.addEventListener("click", toggle);
  row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
});

/* het probleem: woord per woord oplichten bij scroll (de oorspronkelijke statement, nu in de app-typografie) */
(function () {
  const stmt = document.getElementById("stmt"); if (!stmt) return;
  const hot = ["woord", "tegen", "woord.", "élk", "veranderen."];
  const kop = stmt.querySelector(".sr-only"); const kopHtml = kop ? kop.outerHTML : ""; if (kop) kop.remove();
  stmt.innerHTML = kopHtml + stmt.textContent.trim().split(/\s+/).map((w) => `<span class="w${hot.includes(w.toLowerCase()) ? " hot" : ""}">${w}</span>`).join(" ");
  const words = [...stmt.querySelectorAll(".w")];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { words.forEach((w) => w.classList.add("on")); return; }
  // gestuurd door het scrollen (Oskar 06/09): de woorden komen op naarmate het blok omhoog schuift, en zijn
  // allemaal aan tegen dat de bovenkant van het blok op 45 % van het scherm staat — dus vóór u eraan voorbij bent
  const tick = () => {
    const r = stmt.getBoundingClientRect();
    // begint als het blok onderaan verschijnt, is klaar zodra de ónderkant op 92 % van het scherm staat: de hele tekst
    // is dan aan terwijl de eerste regel nog in beeld is — ook op een laag scherm
    const p = Math.min(1, Math.max(0, (innerHeight * 0.92 - r.top) / Math.max(1, r.height)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle("on", i < n));
  };
  addEventListener("scroll", tick, { passive: true }); tick();
})();
