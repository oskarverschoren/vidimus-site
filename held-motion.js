/* Held in beweging (29/10/2026): een dunne laag over de hub-render die het productverhaal vertelt.
   1. Data stroomt binnen: lichtpulsen lopen over de gloedstrips van de vier loopbanden naar de kern, na elkaar en traag.
   2. De kern verankert: bij elke aankomst dijt een dunne ring uit rond de kernvoet en ademt de gloed mee.
   3. De labels antwoorden: hover of focus op Data, Productpaspoort, App of Sensor licht die band op (CSS, :has()).
   De lijnen komen uit de render zelf: de rails van hub.py door de hub-camera geprojecteerd (world_to_camera_view),
   in beeldeenheden van 1600 x 1000 (de desktopbeelden hub-*.webp). Beweging alleen met transform en opacity, in CSS
   (held-motion.css); dit script bouwt de SVG pas na 'load', zet het viewBox gelijk aan wat object-fit: cover toont en
   pauzeert alles buiten beeld of in een verborgen tabblad. Bij prefers-reduced-motion komt er niets bij. */
"use strict";
(() => {
  const figuur = document.querySelector(".hb-held-beeld");
  const img = figuur && figuur.querySelector("img");
  const STIL = matchMedia("(prefers-reduced-motion: reduce)");
  if (!img || STIL.matches || !("ResizeObserver" in window) || !("IntersectionObserver" in window)) return;

  const NS = "http://www.w3.org/2000/svg";
  // het deel van de render dat elk beeld toont, in dezelfde eenheden (hub-m-* = uitsnede 1363,264 – 3840,2135.5 van de 3840-render)
  const BEELD = { x: 0, y: 0, w: 1600, h: 1000 };
  const UITSNEDE = { x: 567.9, y: 110, w: 1032.1, h: 779.8 };
  // per band twee gloedstrips (links, rechts), telkens van de satelliet naar de kernvoet; volgorde = volgorde van aankomst
  const BANDEN = [
    ["data", [[874.6, 416.3, 1007.9, 488.9], [853.9, 427.6, 987.1, 500.2]]],
    ["paspoort", [[1322.2, 427.6, 1188.9, 500.2], [1301.4, 416.3, 1168.1, 488.9]]],
    ["sensor", [[1301.4, 671.4, 1168.1, 598.8], [1322.2, 660.1, 1188.9, 587.5]]],
    ["app", [[853.9, 660.1, 987.1, 587.5], [874.6, 671.4, 1007.9, 598.8]]],
  ];
  const ACHTER = new Set(["data", "paspoort"]);   // die lopen achter de kernvoet in: hun einde valt weg achter de voet
  const VOET = { cx: 1088, cy: 547.4, rx: 113.8, ry: 62 };
  // wat voor de ring en de achterste banden staat: kernvoet, toren en de drie mensjes
  const MASKER = [
    "974,537 976,525 981,515 986,508 994,501 1003,494 1014,488 1026,483 1044,477 1054,475 1065,473 1076,471 1088,471 1100,471 1111,473 1122,475 1132,477 1144,481 1156,485 1167,491 1178,497 1186,504 1193,511 1197,519 1201,529 1202,544 1200,556 1195,565 1190,573 1182,580 1173,586 1162,593 1150,598 1137,601 1124,605 1110,607 1095,608 1081,608 1066,607 1052,605 1039,601 1026,598 1014,593 1004,587 994,580 986,573 981,565 975,552",
    "990,327 992,322 1084,271 1089,271 1182,321 1185,325 1186,334 1168,510 1090,554 1011,513 990,334",
    "1060,606 1069,594 1072,593 1075,593 1086,607 1084,620 1081,642 1079,647 1070,647 1066,646",
    "911,516 920,497 922,494 926,493 929,494 932,512 932,518 931,545 922,548 916,542 911,516",
    "1381,733 1388,721 1391,719 1395,720 1403,730 1400,767 1388,769 1385,765 1382,745 1381,734",
  ];
  const CYCLUS = 8;          // s tussen twee pulsen op dezelfde band (= --hm-puls in held-motion.css)
  const TUSSEN = CYCLUS / BANDEN.length;   // s tussen twee aankomsten in de kern
  const EXTRA = [0, 1.2, 2.4, 3.6];        // s, vier extra pulsen op een band die oplicht (om de 1,2 s)
  const PX_PER_EENHEID = 1.4;              // px per beeldeenheid; kleiner getoond beeld = iets grotere pulsen (tot 2,2 x)

  const maak = (tag, attrs, ouder) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    if (ouder) ouder.appendChild(el);
    return el;
  };
  const vertraag = (el, s) => el.style.setProperty("animation-delay", `${s.toFixed(2)}s`);

  function verloop(defs) {
    const kop = maak("radialGradient", { id: "hm-kop" }, defs);
    [[0, "#ffffff", 1], [0.1, "#f6f8ff", 1], [0.24, "#cdd8ff", 0.78], [0.5, "#7d96ff", 0.32], [1, "#5b7cff", 0]].forEach(([o, c, a]) =>
      maak("stop", { offset: o, "stop-color": c, "stop-opacity": a }, kop));
    const staart = maak("linearGradient", { id: "hm-staart" }, defs);
    [[0, "#5b7cff", 0], [0.55, "#8ea4ff", 0.4], [1, "#f0f4ff", 1]].forEach(([o, c, a]) =>
      maak("stop", { offset: o, "stop-color": c, "stop-opacity": a }, staart));
    const masker = maak("mask", { id: "hm-masker", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: 1600, height: 1000 }, defs);
    maak("rect", { x: 0, y: 0, width: 1600, height: 1000, fill: "#fff" }, masker);
    MASKER.forEach((p) => maak("polygon", { points: p, fill: "#000" }, masker));
  }

  // een puls = twee lichtjes, één op elke gloedstrip van de band, samen op weg naar de kern
  function puls(ouder, klasse, strips, vertraging) {
    const [x0, y0, x1, y1] = strips[0].map((v, i) => (v + strips[1][i]) / 2);   // middellijn van de band
    const hoek = Math.atan2(y1 - y0, x1 - x0);
    const baan = maak("g", { transform: `translate(${x0} ${y0}) rotate(${((hoek * 180) / Math.PI).toFixed(2)})` }, ouder);
    const p = maak("g", { class: klasse }, baan);
    p.style.setProperty("--l", `${Math.hypot(x1 - x0, y1 - y0).toFixed(1)}px`);
    vertraag(p, vertraging);
    const [c, s] = [Math.cos(hoek), Math.sin(hoek)];
    strips.forEach(([sx, sy]) => {
      const dx = sx - x0, dy = sy - y0;   // afstand tot de middellijn, in het gedraaide assenstelsel
      const plek = maak("g", { transform: `translate(${(dx * c + dy * s).toFixed(2)} ${(-dx * s + dy * c).toFixed(2)})` }, p);
      const vorm = maak("g", { class: "hm-vorm" }, plek);
      maak("rect", { x: -100, y: -2.4, width: 100, height: 4.8, rx: 2.4, fill: "url(#hm-staart)" }, vorm);
      maak("circle", { r: 24, fill: "url(#hm-kop)" }, vorm);
      vertraag(vorm, vertraging);
    });
  }

  function bouw() {
    const svg = maak("svg", { class: "hm", viewBox: "0 0 1600 1000", preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" });
    verloop(maak("defs", {}, svg));

    const ring = maak("g", { class: "hm-ring", mask: "url(#hm-masker)" }, svg);
    const ringVorm = maak("g", { class: "hm-ring-vorm" }, ring);
    maak("ellipse", { cx: VOET.cx, cy: VOET.cy, rx: VOET.rx, ry: VOET.ry, class: "hm-ring-zacht" }, ringVorm);
    maak("ellipse", { cx: VOET.cx, cy: VOET.cy, rx: VOET.rx, ry: VOET.ry, class: "hm-ring-lijn" }, ringVorm);
    // de ring start wanneer de eerste puls de voet bereikt: 3,3 s na vertrek (de rit duurt 3,6 s, zie hmRit), daarna om de 2 s
    vertraag(ringVorm, 3.3);

    BANDEN.forEach(([naam, strips], i) => {
      const band = maak("g", { class: `hm-band hm-b-${naam}` }, svg);
      if (ACHTER.has(naam)) band.setAttribute("mask", "url(#hm-masker)");
      strips.forEach(([x0, y0, x1, y1]) => maak("line", { x1: x0, y1: y0, x2: x1, y2: y1, class: "hm-spoor" }, band));
      puls(band, "hm-p", strips, i * TUSSEN);
      const extra = maak("g", { class: "hm-extra" }, band);
      EXTRA.forEach((t) => puls(extra, "hm-p hm-p-snel", strips, t));
    });
    return svg;
  }

  // object-position "84% 50%" -> [0.84, 0.5]; trefwoorden en px vallen terug op het midden
  const WOORD = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  function positie(waarde) {
    const delen = (waarde || "").trim().split(/\s+/);
    return [0, 1].map((i) => {
      const d = delen[i] || "50%";
      if (d.endsWith("%")) return Math.min(1, Math.max(0, parseFloat(d) / 100)) || 0;
      return d in WOORD ? WOORD[d] : 0.5;
    });
  }

  function start() {
    if (STIL.matches || figuur.querySelector(".hm")) return;
    const svg = bouw();
    figuur.insertBefore(svg, figuur.querySelector(".hb-spots"));

    const kader = () => {
      const { width: W, height: H } = img.getBoundingClientRect();
      if (!W || !H) return;
      const bron = /hub-m-/.test(img.currentSrc || img.src) ? UITSNEDE : BEELD;
      const [px, py] = positie(getComputedStyle(img).objectPosition);
      const s = Math.max(W / bron.w, H / bron.h);
      const vw = W / s, vh = H / s;
      const x = bron.x + (bron.w - vw) * px, y = bron.y + (bron.h - vh) * py;
      svg.setAttribute("viewBox", `${x.toFixed(2)} ${y.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
      svg.style.setProperty("--hm-k", Math.min(2.2, Math.max(1, PX_PER_EENHEID / s)).toFixed(3));
    };
    kader();
    new ResizeObserver(kader).observe(img);
    img.addEventListener("load", kader);   // de <picture> wisselt van bron rond 900 px

    let inBeeld = true;
    const rust = () => figuur.classList.toggle("hm-rust", !inBeeld || document.hidden);
    new IntersectionObserver(([e]) => { inBeeld = e.isIntersecting; rust(); }).observe(figuur.closest(".hb-held") || figuur);
    document.addEventListener("visibilitychange", rust);

    figuur.classList.add("hm-aan");
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add("hm-in")));
    STIL.addEventListener("change", () => {
      if (!STIL.matches) return;
      svg.remove();
      figuur.classList.remove("hm-aan", "hm-rust");
    });
  }

  const later = () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 200));
  if (document.readyState === "complete") later();
  else addEventListener("load", later, { once: true });
})();
