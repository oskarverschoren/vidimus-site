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
    const DONKER = !!canvas.closest(".donker");   // 01/10: donkere held → lichte tekens
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
          ctx.fillStyle = i === 0 && Math.random() < 0.02 ? (DONKER ? `rgba(143,176,255,${Math.max(a, 0.3)})` : `rgba(30,79,216,${Math.max(a, 0.22)})`) : (DONKER ? `rgba(233,236,242,${a * 0.9})` : `rgba(11,15,23,${a})`);
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
      hash.textContent = full ? (full.slice(0, 8) + " " + full.slice(8, 16) + " · " + full.slice(-6)) : "········";
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
     Twee uitkomsten, nooit een oordeel over wie liegt: KLOPT of KLOPT NIET (29/09, was IDENTIEK / ONBEKEND). */
  const fields = $$("#tamperFields [data-f]");
  if (fields.length) {
    /* 29/09: de demo is de echte publieke demoregistratie reg_18838643120d. De vingerafdruk wordt berekend over exact dezelfde
       canonieke json als assets/eu/demo/vingerafdruk-invoer.json (sleutels gesorteerd, geen spaties) en naast het echte anker gelegd. */
    const ANCHOR_AT = "29 september om 15:38";
    const ANKER = "7787f6c988fc9ff90819b300e839ad317dc561b20586b7e66220312615e657ba";
    const VAST = { soort: "aflevering", opmerking: "Publieke demoregistratie van Vidimus voor de controle met de EU-validatiesoftware op vidimus.be. Geen echte levering, geen persoonsgegevens." };
    const ORG = "bb2c43946181d940cd3ab4adcf847d311a4ca6b8fa1d36c60ee5a3714b3addaf";
    const original = fields.map((f) => f.textContent);
    const waarde = (f) => { const v = f.textContent.trim(); return "getal" in f.dataset && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v; };
    const payload = () => {
      const p = { ...VAST }; fields.forEach((f) => { p[f.dataset.f] = waarde(f); });
      const gesorteerd = Object.fromEntries(Object.keys(p).sort().map((k) => [k, p[k]]));
      return JSON.stringify({ attachments: {}, canon: "vidimus-json-2", org: ORG, payload: gesorteerd });
    };
    let anchored = "", wasSame = true;

    async function verify() {
      const live = await sha256(payload());
      const same = live === anchored;
      const liveEl = $("#liveHash");
      lockHash(liveEl, live, same ? 7 : 4);
      liveEl.classList.toggle("match", same);
      const v = $("#verdict");
      v.textContent = same ? "KLOPT" : "KLOPT NIET";
      v.classList.toggle("ok", same);
      v.classList.toggle("bad", !same);
      const naamVan = (f) => (f.previousElementSibling?.textContent || f.dataset.f || "veld").trim().toLowerCase();
      const anders = fields.map((f, i) => [f, i]).filter(([f, i]) => f.textContent !== original[i]);
      const gewijzigd = anders.map(([f]) => naamVan(f)).join(", ") || "—";
      $("#verdictSub").textContent = same
        ? `Dit is exact wat op ${ANCHOR_AT} werd vastgelegd.`
        : `Deze versie werd nooit zo vastgelegd. Wat op ${ANCHOR_AT} vastligt: `
          + (anders.length ? anders.map(([f, i]) => `${naamVan(f)} ${original[i].trim()}`).join(" · ") : "een andere inhoud") + ".";
      const st = $("#ladeSt");
      st.textContent = same ? "KLOPT" : "KLOPT NIET";
      st.classList.toggle("ok", same);
      st.classList.toggle("bad", !same);
      $$("#checks [data-c]").forEach((row) => {
        const s = row.querySelector(".st");
        s.textContent = same ? "KLOPT" : "KLOPT NIET";
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
    /* één klik: een collega maakt van 18 paletten 17; staat het oordeel niet in beeld (op een gsm staat het onder de kaart), dan schuift het erin */
    const toonOordeel = () => {
      const r = $("#verdictBlok").getBoundingClientRect();
      if (r.top < 72 || r.bottom > innerHeight) $("#verdictBlok").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    };
    const colli = fields.find((f) => /paletten/.test(f.textContent));
    $("#tamper17").addEventListener("click", async () => {
      fields.forEach((f, i) => (f.textContent = original[i]));
      if (colli) colli.textContent = colli.textContent.replace(/\b18\b/, "17");
      await verify(); toonOordeel();
    });
    fields.forEach((f, i) => f.addEventListener("blur", () => { if (f.textContent !== original[i]) setTimeout(toonOordeel, 200); }));
    anchored = ANKER;
    lockHash($("#anchorHash"), ANKER, 9);
    verify();
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

/* samenvatting op de ingeklapte controles: 6 × klopt / n × klopt niet, volgt de demo */
(function () {
  const sum = document.getElementById("zesSum"); if (!sum) return;
  const upd = () => { const bad = document.querySelectorAll("#checks .st.bad").length; sum.textContent = bad ? `${bad} × klopt niet` : "6 × klopt"; sum.classList.toggle("bad", bad > 0); };
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
  const hot = ["achteraf", "aantonen", "stond?"];
  const kop = stmt.querySelector(".sr-only"); const kopHtml = kop ? kop.outerHTML : ""; if (kop) kop.remove();
  stmt.innerHTML = kopHtml + stmt.textContent.trim().split(/\s+/).map((w) => `<span class="w${hot.includes(w.toLowerCase()) ? " hot" : ""}">${w}</span>`).join(" ");
  const words = [...stmt.querySelectorAll(".w")];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { words.forEach((w) => w.classList.add("on")); return; }
  // gestuurd door het scrollen (Oskar 06/09): de woorden komen op naarmate het blok omhoog schuift, en zijn
  // allemaal aan tegen dat de bovenkant van het blok op 45 % van het scherm staat — dus vóór u eraan voorbij bent
  // het origineel (site v2): traject = hoogte van het blok + een derde scherm
  // de versie die Oskar koos (06/09): klaar als de bovenkant van het blok op ~12 % van het scherm staat
  const tick = () => {
    const r = stmt.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.88)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle("on", i < n));
  };
  addEventListener("scroll", tick, { passive: true }); tick();
})();

/* één registratie, twee lagen (29/09, adviseur): links uw systeem mét audit trail — dat erkennen we —, rechts de verankering
   buiten uw systeem. De vraag is niet of uw systeem wijzigingen bijhoudt, maar wie buiten uw systeem kan nakijken wat er stond. */
(function () {
  const root = document.getElementById("tweeLevens"); if (!root) return;
  const db = root.querySelector('[data-kant="db"]'), an = root.querySelector('[data-kant="anker"]');
  const zet = (kaart, sel, tekst, klasse) => { const el = kaart.querySelector(sel); el.textContent = tekst; if (klasse !== undefined) el.className = klasse; };
  const lading = db.querySelector('[data-f="lading"]'), log = db.querySelector("[data-extra]"), ext = an.querySelector("[data-extra]");
  const STAPPEN = [
    () => { // 01 vastgelegd
      lading.textContent = "18 paletten diepvries"; lading.className = ""; log.hidden = true; ext.hidden = true;
      zet(db, "[data-v]", "versie 1 · 15:38:25", "tl-versie"); zet(db, "[data-noot]", "Uw systeem legt de registratie vast. Zoals het hoort.", "tl-noot");
      zet(an, "[data-noot]", "Op hetzelfde moment: vingerafdruk 7787f6c9…, tijdstempel om 15:38:38, gekwalificeerd om 15:38:56.", "tl-noot");
    },
    () => { // 02 later gewijzigd — de audit trail doet zijn werk
      lading.textContent = "17 paletten diepvries"; lading.className = "wijzig";
      log.hidden = false; log.innerHTML = "<span><b>audit trail ✓</b> · 15:52:10 · registratie 18 → 17 paletten</span><span>wie, wat en wanneer: netjes bijgehouden in uw systeem</span>";
      zet(db, "[data-v]", "versie 2 · 15:52:10", "tl-versie"); zet(db, "[data-noot]", "Een correctie, een migratie, een fout: de registratie wordt aangepast. Uw audit trail houdt het bij.", "tl-noot");
      ext.hidden = true; zet(an, "[data-noot]", "Het anker verandert niet mee: het ligt buiten uw systeem. De oorspronkelijke 18 blijft narekenbaar.", "tl-noot ok");
    },
    () => { // 03 wie kan het nakijken?
      zet(db, "[data-v]", "audit trail · binnen uw systeem", "tl-versie");
      zet(db, "[data-noot]", "Een klant, verzekeraar of rechter vraagt wat er om 15:38:25 stond. Het antwoord komt uit hetzelfde systeem dat ook de wijziging bevat.", "tl-noot vraag");
      ext.hidden = false; ext.innerHTML = "<span><b>SHA-256</b> 7787f6c9… → <b>gekwalificeerd tijdstempel</b> 15:38:56 → <b>anker</b> buiten uw systeem</span><span>Europese validatiesoftware: PASSED · de controlepagina opent zonder account</span>";
      zet(an, "[data-noot]", "Iedereen kan het nakijken, zonder account en zonder ons: de oorspronkelijke 18 paletten klopt met het anker van 15:38:25.", "tl-noot ok");
    },
  ];
  const knoppen = [...root.querySelectorAll(".tl-stap")]; let auto = null, geraakt = false;
  const ga = (i) => { STAPPEN[i](); knoppen.forEach((b, k) => { b.classList.toggle("cur", k === i); b.setAttribute("aria-selected", String(k === i)); });
    root.querySelector('[data-u="db"]').classList.toggle("aan", i >= 1); root.querySelector('[data-u="anker"]').classList.toggle("aan", i >= 1); };
  knoppen.forEach((b, i) => b.addEventListener("click", () => { geraakt = true; clearInterval(auto); ga(i); }));
  // speelt één keer vanzelf af zodra het in beeld komt; wie klikt, neemt over
  const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting && !auto && !geraakt) { let i = 0; auto = setInterval(() => { i++; if (i >= STAPPEN.length) { clearInterval(auto); return; } ga(i); }, 3200); io.disconnect(); } }); }, { threshold: .6 });
  io.observe(root); ga(0);
})();


/* ── 03 · De app: scroll-gedreven 3D-presentatie (14/09) ── */
(function () {
  const wrap = document.getElementById("stageWrap"), tel = document.getElementById("tel"); if (!wrap || !tel) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const schermen = tel.querySelectorAll(".scherm"), stappen = document.querySelectorAll("#stappen li"), punten = document.querySelectorAll(".punten i"), ring = wrap.querySelector(".ring3d");
  const n = schermen.length; let huidig = -1, ticking = false;
  const zet = (i) => { if (i === huidig) return; huidig = i; schermen.forEach((s, k) => s.classList.toggle("is-on", k === i)); stappen.forEach((s, k) => s.classList.toggle("is-on", k === i)); punten.forEach((s, k) => s.classList.toggle("is-on", k === i)); };
  const teken = () => {
    ticking = false;
    const r = wrap.getBoundingClientRect(), h = wrap.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, h)));           // 0 → 1 over de hele sectie
    const stap = Math.min(n - 1, Math.floor(p * n + 0.0001)); zet(stap);
    const lokaal = (p * n) - stap;                                            // 0 → 1 binnen een stap
    const ry = -16 + p * 32;                                                  // draait van links naar rechts
    const rx = 4 - Math.sin(p * Math.PI) * 6;                                 // even naar voren kantelen in het midden
    const ty = Math.sin(lokaal * Math.PI) * -10;                              // zachte zweving per stap
    tel.style.setProperty("--ry", ry.toFixed(2) + "deg"); tel.style.setProperty("--ryn", ry.toFixed(2)); tel.style.setProperty("--rx", rx.toFixed(2) + "deg"); tel.style.setProperty("--ty", ty.toFixed(1) + "px");
    if (ring) ring.style.setProperty("--ring", (p * 120).toFixed(1) + "deg");
  };
  const vraag = () => { if (!ticking) { ticking = true; requestAnimationFrame(teken); } };
  addEventListener("scroll", vraag, { passive: true }); addEventListener("resize", vraag); teken();
})();

/* 26/09: mobiel menu — de bovenste navigatie staat op een gsm verborgen; één knop opent dezelfde links plus inloggen */
(function () {
  const kop = document.querySelector("header.site"), nav = kop && kop.querySelector(".topnav");
  if (!kop || !nav) return;
  const knop = document.createElement("button");
  knop.type = "button"; knop.className = "menu-knop"; knop.setAttribute("aria-label", "Menu"); knop.setAttribute("aria-expanded", "false");
  knop.innerHTML = "<span></span><span></span>";
  const paneel = document.createElement("nav");
  paneel.className = "mob-menu"; paneel.hidden = true; paneel.setAttribute("aria-label", "Menu");
  paneel.innerHTML = nav.innerHTML;
  const login = kop.querySelector(".top-login");
  if (login) { const a = login.cloneNode(true); a.className = "mob-login"; paneel.append(a); }
  kop.append(knop); kop.after(paneel);
  const zet = (open) => { paneel.hidden = !open; knop.setAttribute("aria-expanded", String(open)); };
  knop.addEventListener("click", () => zet(paneel.hidden));
  paneel.addEventListener("click", (e) => { if (e.target.closest("a")) zet(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") zet(false); });
  addEventListener("resize", () => { if (innerWidth > 720) zet(false); });
})();

/* 27/09 (Oskar, in de app: "alweer geen weg terug; het logo brengt me naar de website"): opent de iPhone/Android-app een
   pagina van vidimus.be, dan komt er één terugknop en gaat ook het logo terug naar de app. Buiten de app gebeurt niets.
   De logica zelf staat één keer, in de app (webapp/terug.js). */
(function () {
  if (!/VidimusApp/.test(navigator.userAgent)) return;
  const s = document.createElement("script");
  s.src = "https://app.vidimus.be/webapp/terug.js"; s.defer = true;
  document.head.append(s);
})();

/* 01/10 (Oskar): donkere held bovenaan; de kop kleurt mee zolang de held eronder ligt */
(function () {
  const held = document.querySelector(".hero.donker"), kop = document.querySelector("header.site"); if (!held || !kop) return;
  const zet = () => { const r = held.getBoundingClientRect(); kop.classList.toggle("op-donker", r.bottom > 30); };
  addEventListener("scroll", zet, { passive: true }); addEventListener("resize", zet); zet();
})();
