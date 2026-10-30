/* Beeld in beweging (30/10/2026): elke productillustratie op vidimus.be vertelt rustig haar deel van het verhaal,
   zoals de held (held-motion.js). Een dunne SVG-laag ligt exact op de render: de geometrie komt uit de Blender-scènes,
   door de render-camera geprojecteerd (beeld-motion-data.js, gegenereerd). Dit script zoekt de beelden zelf op hun bron
   (assets/illustratie/<naam>-<breedte>.webp), bouwt de laag pas na 'load' en op een rustig moment, zet het viewBox gelijk
   aan wat object-fit en de gekozen bron (volledig of mobiele uitsnede) tonen, en speelt alleen in beeld en in een
   zichtbaar tabblad. Beweging alleen met transform en opacity (Web Animations, geen inline stijlregels). Bij
   prefers-reduced-motion komt er niets bij. */
"use strict";
(() => {
  const DATA = window.VBEELD;
  const STIL = matchMedia("(prefers-reduced-motion: reduce)");
  if (!DATA || STIL.matches || !("ResizeObserver" in window) || !("IntersectionObserver" in window) || !Element.prototype.animate) return;

  const NS = "http://www.w3.org/2000/svg";
  const BRON = /assets\/illustratie\/(app|sensor|data|paspoort|bewijsketen|kluis|controle)-(\d+)\.webp/;
  const UITSNEDE = /-(900|1800)\.webp/;      // de mobiele uitsnede van de vier productbeelden
  const STAP = 2.5;                           // s minstens tussen de start van twee beelden: wat samen in beeld komt, ademt na elkaar
  const PX_PER_EENHEID = 1.4;                 // zoals de held: kleiner getoond beeld = iets grotere lichtjes
  const K_MAX = 2.4;
  const IN_STAP = 1.3;                        // s dat een stap van de bewijsketen meelicht met zijn poort
  let teller = 0;
  let laatsteStart = -Infinity;               // ms (performance.now) waarop het vorige beeld zijn eerste cyclus begon

  const maak = (tag, attrs, ouder) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    if (ouder) ouder.appendChild(el);
    return el;
  };
  const r2 = (v) => Math.round(v * 100) / 100;
  const paren = (p) => p.reduce((a, v, i) => (i % 2 ? a : a.concat([[v, p[i + 1]]])), []);
  const punten = (pp) => pp.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ");
  // sinus in en uit; de afgelegde fractie f wordt bereikt op tijdsfractie acos(1 - 2f) / pi (zelfde als maak_beeld_data.py)
  const tijdVoor = (f) => Math.acos(1 - 2 * Math.min(1, Math.max(0, f))) / Math.PI;

  /* ---------- keyframes: alles binnen één cyclus C, vensters [a, a + d] ---------- */
  function sleutels(C, lijst) {
    // lijst: [[t (s), {props}], ...] -> keyframes met offset; begin en einde vullen we met de eerste en laatste stand
    const k = lijst.map(([t, p]) => ({ offset: Math.min(1, Math.max(0, t / C)), ...p }));
    for (let i = 1; i < k.length; i++) if (k[i].offset < k[i - 1].offset) k[i].offset = k[i - 1].offset;
    if (k[0].offset > 0) k.unshift({ ...k[0], offset: 0 });
    if (k[k.length - 1].offset < 1) k.push({ ...k[k.length - 1], offset: 1 });
    return k;
  }
  const dooft = (C, a, d, o = 1, inF = 0.1, uitF = 0.12) =>
    sleutels(C, [[a, { opacity: 0 }], [a + d * inF, { opacity: o }], [a + d * (1 - uitF), { opacity: o }], [a + d, { opacity: 0 }]]);

  /* ---------- verlopen per laag (id's uniek per laag) ---------- */
  function verlopen(defs, id) {
    const stops = (el, lijst) => lijst.forEach(([o, c, a]) => maak("stop", { offset: o, "stop-color": c, "stop-opacity": a }, el));
    stops(maak("radialGradient", { id: `${id}-kop` }, defs),
      [[0, "#ffffff", 1], [0.1, "#f6f8ff", 1], [0.24, "#cdd8ff", 0.8], [0.5, "#7d96ff", 0.34], [1, "#5b7cff", 0]]);
    stops(maak("linearGradient", { id: `${id}-staart` }, defs), [[0, "#5b7cff", 0], [0.55, "#8ea4ff", 0.42], [1, "#f0f4ff", 1]]);
    stops(maak("radialGradient", { id: `${id}-gloed` }, defs), [[0, "#eef2ff", 0.92], [0.35, "#8ea4ff", 0.5], [1, "#5b7cff", 0]]);
    stops(maak("linearGradient", { id: `${id}-band` }, defs), [[0, "#dfe6ff", 0], [0.5, "#ffffff", 0.62], [1, "#dfe6ff", 0]]);
  }

  /* ---------- de elementen ---------- */
  const BOUW = {
    // een zacht licht met korte staart dat over een pad loopt (kop + staart, zoals op de held)
    puls(e, ctx) {
      const pp = paren(e.p);
      const lengtes = [0];
      for (let i = 1; i < pp.length; i++) lengtes.push(lengtes[i - 1] + Math.hypot(pp[i][0] - pp[i - 1][0], pp[i][1] - pp[i - 1][1]));
      const L = lengtes[lengtes.length - 1] || 1;
      let vorige = null;
      const hoeken = pp.map((p, i) => {
        const [a, b] = i < pp.length - 1 ? [p, pp[i + 1]] : [pp[i - 1], p];
        let h = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        if (vorige !== null) while (h - vorige > 180) h -= 360;
        if (vorige !== null) while (vorige - h > 180) h += 360;
        return (vorige = h);
      });
      const baan = maak("g", { class: "bm-baan" }, ctx.laag);
      const vorm = maak("g", { class: "bm-vorm" }, baan);
      const w = Math.max(3, e.r * 0.2);
      maak("rect", { x: -e.l, y: -w / 2, width: e.l, height: w, rx: w / 2, fill: `url(#${ctx.id}-staart)` }, vorm);
      maak("circle", { r: e.r, fill: `url(#${ctx.id}-kop)` }, vorm);
      ctx.anim(baan, sleutels(ctx.C, pp.map(([x, y], i) =>
        [e.a + e.d * tijdVoor(lengtes[i] / L), { transform: `translate(${r2(x)}px, ${r2(y)}px) rotate(${r2(hoeken[i])}deg)` }])));
      ctx.anim(vorm, dooft(ctx.C, e.a, e.d, e.o || 1, 0.07, 0.1));
      return baan;
    },
    // een dunne ring die uitdijt en dooft; met m ligt hij in een vlak van de scène (bv. de vloer rond het anker)
    ring(e, ctx) {
      const m = e.m || [1, 0, 0, 1];
      const g = maak("g", { class: "bm-ring", transform: `matrix(${m.join(" ")} ${e.c[0]} ${e.c[1]})` }, ctx.laag);
      const vorm = maak("g", { class: e.w ? "bm-ring-vorm bm-golf" : "bm-ring-vorm" }, g);
      maak("circle", { r: 1, class: "bm-ring-zacht" }, vorm);
      maak("circle", { r: 1, class: "bm-ring-lijn" }, vorm);
      const s = (r) => ({ transform: `scale(${r2(r)})` });
      ctx.anim(vorm, sleutels(ctx.C, [[e.a, { ...s(e.r0), opacity: 0, easing: "cubic-bezier(.2, .55, .35, 1)" }],
        [e.a + e.d * 0.08, { ...s(e.r0 + (e.r1 - e.r0) * 0.08), opacity: e.w ? 0.95 : 0.9, easing: "cubic-bezier(.2, .55, .35, 1)" }],
        [e.a + e.d, { ...s(e.r1), opacity: 0 }]]));
      if (e.g !== undefined) {   // vaste ring voor hover op de bijhorende stap
        const vast = maak("g", { class: `bm-vast bm-vast-${e.g}`, transform: `translate(${e.c[0]} ${e.c[1]}) scale(${r2(e.r0 * 1.12)})` }, ctx.laag);
        maak("circle", { r: 1, class: "bm-ring-zacht" }, vast);
        maak("circle", { r: 1, class: "bm-ring-lijn" }, vast);
      }
      return g;
    },
    // een zachte gloed die even opademt
    gloed(e, ctx) {
      const g = maak("g", { transform: `translate(${e.c[0]} ${e.c[1]})` }, ctx.laag);
      const c = maak("circle", { r: e.r, fill: `url(#${ctx.id}-gloed)`, class: "bm-gloed" }, g);
      ctx.anim(c, sleutels(ctx.C, [[e.a, { opacity: 0, transform: "scale(.82)" }], [e.a + e.d * 0.3, { opacity: e.o, transform: "scale(1)" }],
        [e.a + e.d, { opacity: 0, transform: "scale(1.06)" }]]));
      if (e.st !== undefined) ctx.stappen.push([e.a, e.st]);
      return g;
    },
    // een glans die over een vlak strijkt (scherm, label, scanvlak), binnen de rand van dat vlak
    glans(e, ctx) {
      const pp = paren(e.q);
      const xs = pp.map((p) => p[0]), ys = pp.map((p) => p[1]);
      const [cx, cy] = [xs.reduce((a, b) => a + b) / xs.length, ys.reduce((a, b) => a + b) / ys.length];
      const [bw, bh] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
      const v = e.v || [bw * 0.9, bh * 0.45];
      const lv = Math.hypot(v[0], v[1]) || 1;
      const hoek = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
      const dik = lv * (e.smal ? 0.22 : 0.42), lang = (bw + bh) * 2;
      const clip = `${ctx.id}-cl${ctx.n++}`;
      maak("polygon", { points: punten(pp) }, maak("clipPath", { id: clip }, ctx.defs));
      const g = maak("g", { "clip-path": `url(#${clip})` }, ctx.laag);
      const band = maak("rect", { x: -dik / 2, y: -lang / 2, width: dik, height: lang, fill: `url(#${ctx.id}-band)`, class: "bm-band" }, g);
      const t = (f) => ({ transform: `translate(${r2(cx + v[0] * f)}px, ${r2(cy + v[1] * f)}px) rotate(${r2(hoek)}deg)` });
      ctx.anim(band, sleutels(ctx.C, [[e.a, { ...t(-0.8), opacity: 0 }], [e.a + e.d * 0.15, { ...t(-0.5), opacity: 1 }],
        [e.a + e.d * 0.85, { ...t(0.5), opacity: 1 }], [e.a + e.d, { ...t(0.8), opacity: 0 }]]));
      return g;
    },
    // een scanvlak dat langzaam door een kader zakt (de vingerafdruk wordt berekend)
    vlak(e, ctx) {
      const g = maak("g", { class: "bm-vlak" }, ctx.laag);
      const pp = punten(paren(e.q));
      maak("polygon", { points: pp, class: "bm-vlak-vul" }, g);
      maak("polygon", { points: pp, class: "bm-vlak-zacht" }, g);
      maak("polygon", { points: pp, class: "bm-vlak-lijn" }, g);
      const t = (f) => ({ transform: `translate(${r2(e.v[0] * f)}px, ${r2(e.v[1] * f)}px)` });
      ctx.anim(g, sleutels(ctx.C, [[e.a, { ...t(0), opacity: 0, easing: "ease-in-out" }], [e.a + e.d * 0.12, { ...t(0.05), opacity: 1, easing: "ease-in-out" }],
        [e.a + e.d * 0.85, { ...t(0.92), opacity: 1 }], [e.a + e.d, { ...t(1), opacity: 0 }]]));
      return g;
    },
    // vier hoekhaken die op een label vallen, zoals een zoeker die een QR-code vindt
    haken(e, ctx) {
      const pp = paren(e.q);
      const [cx, cy] = [pp.reduce((a, p) => a + p[0], 0) / 4, pp.reduce((a, p) => a + p[1], 0) / 4];
      const g = maak("g", { class: "bm-haken" }, ctx.laag);
      pp.forEach((p, i) => {
        const [a, b] = [pp[(i + 3) % 4], pp[(i + 1) % 4]];
        const naar = (q) => [p[0] + (q[0] - p[0]) * 0.26, p[1] + (q[1] - p[1]) * 0.26];
        maak("polyline", { points: punten([naar(a), p, naar(b)]) }, g);
      });
      const s = (f) => ({ transform: `translate(${r2(cx)}px, ${r2(cy)}px) scale(${f}) translate(${r2(-cx)}px, ${r2(-cy)}px)` });
      ctx.anim(g, sleutels(ctx.C, [[e.a, { ...s(1.22), opacity: 0, easing: "cubic-bezier(.2, .7, .3, 1)" }], [e.a + e.d * 0.25, { ...s(1), opacity: 1 }],
        [e.a + e.d * 0.8, { ...s(1), opacity: 1 }], [e.a + e.d, { ...s(1), opacity: 0 }]]));
      return g;
    },
    // een lichtboog die één keer rond een ring op de vloer gaat; wat achter de kluis valt, verdwijnt erachter
    boog(e, ctx) {
      const mk = `${ctx.id}-mk${ctx.n++}`;
      const masker = maak("mask", { id: mk, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: ctx.u[0], height: ctx.u[1] }, ctx.defs);
      maak("rect", { x: 0, y: 0, width: ctx.u[0], height: ctx.u[1], fill: "#fff" }, masker);
      e.mk.forEach((p) => maak("polygon", { points: punten(paren(p)), fill: "#000" }, masker));
      const buiten = maak("g", { mask: `url(#${mk})` }, ctx.laag);
      const vlak = maak("g", { transform: `matrix(${e.m.join(" ")} ${e.c[0]} ${e.c[1]})` }, buiten);
      const draai = maak("g", { class: "bm-boog" }, vlak);
      const R = e.R, boog = (graden) => {
        const a = (-graden * Math.PI) / 180;
        return `M ${r2(R * Math.cos(a))} ${r2(R * Math.sin(a))} A ${R} ${R} 0 0 1 ${R} 0`;
      };
      [[e.b0, "bm-boog-lang"], [e.b0 * 0.45, "bm-boog-mid"], [e.b0 * 0.14, "bm-boog-kop"]].forEach(([b, k]) => maak("path", { d: boog(b), class: k }, draai));
      maak("circle", { cx: R, cy: 0, r: 0.16, fill: `url(#${ctx.id}-kop)` }, draai);
      ctx.anim(draai, sleutels(ctx.C, [[e.a, { transform: "rotate(-150deg)", opacity: 0, easing: "cubic-bezier(.45, .05, .55, .95)" }],
        [e.a + e.d * 0.1, { transform: "rotate(-114deg)", opacity: 1, easing: "cubic-bezier(.45, .05, .55, .95)" }],
        [e.a + e.d * 0.88, { transform: "rotate(167deg)", opacity: 1 }], [e.a + e.d, { transform: "rotate(210deg)", opacity: 0 }]]));
      return buiten;
    },
    // een lijn (het vinkje) die oplicht, net berekend
    lijn(e, ctx) {
      const g = maak("g", { class: "bm-lijn" }, ctx.laag);
      const pp = punten(paren(e.p));
      maak("polyline", { points: pp, class: "bm-lijn-zacht" }, g);
      maak("polyline", { points: pp, class: "bm-lijn-kern" }, g);
      ctx.anim(g, dooft(ctx.C, e.a, e.d, 1, 0.12, 0.45));
      return g;
    },
    // de route zelf, alleen zichtbaar bij hover of focus op de tegel van het beeld
    spoor(e, ctx) {
      return maak("polyline", { points: punten(paren(e.p)), class: "bm-spoor" }, ctx.laag);
    },
  };

  /* ---------- kader: de laag ligt precies op het beeld, ook bij object-fit: cover en een andere bron ---------- */
  const WOORD = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  function positie(waarde) {
    const delen = (waarde || "").trim().split(/\s+/);
    return [0, 1].map((i) => {
      const d = delen[i] || "50%";
      if (d.endsWith("%")) return Math.min(1, Math.max(0, parseFloat(d) / 100)) || 0;
      return d in WOORD ? WOORD[d] : 0.5;
    });
  }
  function doosIn(img, ouder) {
    let x = 0, y = 0, el = img;
    while (el && el !== ouder) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    if (el === ouder) return [x, y];
    const [a, b] = [img.getBoundingClientRect(), ouder.getBoundingClientRect()];   // ouder niet in de keten: terugval
    return [a.left - b.left - ouder.clientLeft, a.top - b.top - ouder.clientTop];
  }

  function bouw(img, naam) {
    const d = DATA[naam];
    const picture = img.parentElement && img.parentElement.tagName === "PICTURE" ? img.parentElement : null;
    const anker = picture || img;
    const ouder = anker.parentElement;
    const id = `bm${teller++}`;
    const svg = maak("svg", { class: `bm bm-${naam}`, viewBox: `0 0 ${d.u[0]} ${d.u[1]}`, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" });
    const defs = maak("defs", {}, svg);
    verlopen(defs, id);
    const laag = maak("g", {}, svg);
    const animaties = [];
    const ctx = {
      id, defs, laag, C: d.C, u: d.u, n: 0, stappen: [],
      anim(el, kf) {
        const a = el.animate(kf, { duration: d.C * 1000, iterations: Infinity, fill: "backwards" });
        a.pause();
        animaties.push(a);
      },
    };
    d.e.forEach((e) => BOUW[e.k] && BOUW[e.k](e, ctx));
    anker.after(svg);

    const kader = () => {
      const W = img.offsetWidth, H = img.offsetHeight;
      if (!W || !H) return;
      const [x0, y0] = doosIn(img, ouder);
      svg.style.setProperty("left", `${x0}px`);
      svg.style.setProperty("top", `${y0}px`);
      svg.style.setProperty("width", `${W}px`);
      svg.style.setProperty("height", `${H}px`);
      const bron = d.m && UITSNEDE.test(img.currentSrc || img.src) ? { x: d.m[0], y: d.m[1], w: d.m[2], h: d.m[3] } : { x: 0, y: 0, w: d.u[0], h: d.u[1] };
      const cs = getComputedStyle(img);
      let vb = bron;
      if (cs.objectFit === "cover") {
        const [px, py] = positie(cs.objectPosition);
        const s = Math.max(W / bron.w, H / bron.h);
        const vw = W / s, vh = H / s;
        vb = { x: bron.x + (bron.w - vw) * px, y: bron.y + (bron.h - vh) * py, w: vw, h: vh };
      }
      svg.setAttribute("viewBox", `${r2(vb.x)} ${r2(vb.y)} ${r2(vb.w)} ${r2(vb.h)}`);
      svg.style.setProperty("--bm-k", Math.min(K_MAX, Math.max(1, PX_PER_EENHEID / (W / vb.w))).toFixed(3));
    };
    kader();
    const ro = new ResizeObserver(kader);
    ro.observe(img);
    ro.observe(ouder);
    img.addEventListener("load", kader);   // <picture> en srcset wisselen van bron rond de breekpunten

    // de bewijsketen: de stap onder het beeld licht mee met zijn poort (na de eerste onthulling door hub.js)
    const keten = ctx.stappen.length ? document.querySelector("[data-keten]") : null;
    const stapEls = keten ? [...keten.querySelectorAll(".hb-stap")] : [];
    let klok = 0;
    const tik = () => {
      const a = animaties[0];
      if (!a || a.currentTime === null || a.currentTime < 0) return;
      const t = (a.currentTime / 1000) % d.C;
      const vrij = !keten.classList.contains("hb-wacht") || keten.classList.contains("klaar");
      stapEls.forEach((el, i) => {
        const aan = vrij && ctx.stappen.some(([s, st]) => st === i && t >= s && t < s + IN_STAP);
        el.classList.toggle("bm-nu", aan);
      });
    };

    let inBeeld = false, gestart = false;
    const speel = () => {
      const aan = inBeeld && !document.hidden;
      if (aan && !gestart) {   // de eerste keer: begin bij het begin van het verhaal, maar niet tegelijk met een ander beeld
        const nu = performance.now();
        const wacht = Math.max(0, laatsteStart + STAP * 1000 - nu);
        laatsteStart = nu + wacht;
        animaties.forEach((a) => { a.currentTime = -wacht; });
        gestart = true;
      }
      animaties.forEach((a) => (aan ? a.play() : a.pause()));
      if (stapEls.length) {
        clearInterval(klok);
        if (aan) klok = setInterval(tik, 200);
        else stapEls.forEach((el) => el.classList.remove("bm-nu"));
      }
    };
    const io = new IntersectionObserver(([e]) => { inBeeld = e.isIntersecting; speel(); }, { rootMargin: "60px 0px" });
    io.observe(ouder);
    document.addEventListener("visibilitychange", speel);
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("bm-in")));

    return () => {   // opruimen als iemand alsnog minder beweging vraagt
      animaties.forEach((a) => a.cancel());
      clearInterval(klok);
      stapEls.forEach((el) => el.classList.remove("bm-nu"));
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", speel);
      svg.remove();
    };
  }

  function start() {
    if (STIL.matches) return;
    const imgs = [...document.querySelectorAll("img")].filter((img) => BRON.test(img.getAttribute("src") || ""));
    const opruimers = imgs.map((img) => bouw(img, BRON.exec(img.getAttribute("src"))[1]));
    STIL.addEventListener("change", () => { if (STIL.matches) opruimers.forEach((f) => f()); });
  }

  const later = () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 250));
  if (document.readyState === "complete") later();
  else addEventListener("load", later, { once: true });
})();
