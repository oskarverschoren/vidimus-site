/* Homepage als hub (29/10/2026). Drie kleine dingen, zonder framework en zonder tracking:
   1. de vier stappen van de bewijsketen lichten na elkaar op zodra ze in beeld komen;
   2. koppen en blokken schuiven zacht omhoog bij het scrollen (alleen transform: alles is zichtbaar, ook zonder JavaScript);
   3. de rekenhulp bij Prijs, met prijs.js (dezelfde rekensom als /prijzen, de aanmelding en de facturatie).
   Bij prefers-reduced-motion beweegt er niets: de stappen staan meteen aan. */
"use strict";
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const STIL = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const IO = "IntersectionObserver" in window;
  const STAP_MS = 420;   // tijd tussen twee stappen van de keten

  /* 1 · de bewijsketen: eerst gedimd (niet onzichtbaar), dan stap voor stap aan */
  const keten = $("[data-keten]");
  if (keten && IO && !STIL) {
    const stappen = $$(".hb-stap", keten);
    keten.classList.add("hb-wacht");
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      keten.classList.add("loopt");
      stappen.forEach((s, i) => setTimeout(() => s.classList.add("aan"), 120 + i * STAP_MS));
      setTimeout(() => keten.classList.add("klaar"), 120 + stappen.length * STAP_MS);
    }, { threshold: 0.35 });
    io.observe(keten);
  }

  /* 2 · zacht omhoog: alleen wat nog onder de vouw staat, en alleen met transform */
  if (IO && !STIL) {
    const doelen = $$(".hb-sec .hb-kop, .hb-tegels > li, .hb-inbegrepen, .hb-v, .hb-drie, .hb-eu-beeld, .hb-eu-tekst, .hb-bev > div, .hb-vb > li, .hb-reken, .hb-code");
    const onder = doelen.filter((el) => el.getBoundingClientRect().top > innerHeight);
    onder.forEach((el) => el.classList.add("hb-laag"));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.remove("hb-laag");
      io.unobserve(e.target);
    }), { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    onder.forEach((el) => io.observe(el));
  }

  /* 3 · rekenhulp: een schuif met vaste stappen, het bedrag uit prijs.js */
  const P = window.VPRIJS, schuif = $("#hbN");
  if (!P || !schuif) return;
  const STAPPEN = [100, 150, 250, 500, 1000, 2000, 3000, 5000, 10000, 25000, 50000, 100000, 250000];
  const aantal = (n) => n.toLocaleString("nl-BE").replace(/\./g, " ");
  const eur = (x) => P.eur(x).replace(/\./g, " ");
  const sensoren = $("#hbB");
  const getal = (el, hi) => { const n = Math.round(Number(el.value)); return Number.isFinite(n) ? Math.max(0, Math.min(hi, n)) : 0; };

  function reken() {
    const n = STAPPEN[getal(schuif, STAPPEN.length - 1)], b = getal(sensoren, 999);
    const s = P.schatting(n, b);
    $("#hbNuit").textContent = aantal(n);
    schuif.setAttribute("aria-valuetext", `${aantal(n)} registraties per maand`);
    schuif.style.setProperty("--vul", `${(getal(schuif, STAPPEN.length - 1) / (STAPPEN.length - 1)) * 100}%`);
    $("#hbBedrag").textContent = eur(s.maand);
    $("#hbPer").textContent = s.maand === 0 ? "per maand: binnen het gratis deel" : "per maand, excl. btw";
    const regels = [`${aantal(n)} registraties${n <= P.GRATIS ? "" : `, de eerste ${P.GRATIS} gratis`}: ${eur(s.registraties)}`];
    if (b) regels.push(`${aantal(b)} ${b === 1 ? "sensor of logger" : "sensoren of loggers"}, de eerste gratis: ${eur(s.toestellen)}`);
    if (s.minimum) regels.push(`aangevuld tot het minimum van ${eur(P.MINIMUM)}`);
    $("#hbRegels").textContent = regels.join(" · ");
  }
  schuif.addEventListener("input", reken);
  sensoren.addEventListener("input", reken);
  reken();
})();
