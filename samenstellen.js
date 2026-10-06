/* Stel zelf samen (06/10/2026): live maandprijs, maandelijks of jaarcontract. Zelfde rekensom als vidimus/billing.py,
   prijzen.html en /jaarcontract/voorstel: eerste 100 registraties gratis, dan per schijf 0,08 → 0,04 → 0,01 → 0,003;
   eerste meettoestel gratis, dan € 15 per maand; minimum € 19 zodra er iets te betalen is; jaarcontract = 10 maanden over 12. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const n = $("#samN"), b = $("#samB"); if (!n || !b) return;
  const STAPPEN = [0, 50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000, 100000, 250000, 500000, 750000, 1000000];
  const GRATIS = 100, BRON = 15, MIN = 19, SCHIJVEN = [[3000, 0.08], [10000, 0.04], [100000, 0.01], [null, 0.003]];
  const num = (x) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const eur = (x) => "€ " + (Math.round(x * 100) % 100 === 0 ? num(Math.round(x)) : x.toFixed(2).replace(".", ","));
  const regPrijs = (r) => {
    if (r <= GRATIS) return 0;
    let t = 0, vorige = GRATIS;
    for (const [grens, tarief] of SCHIJVEN) { const top = grens === null ? r : Math.min(r, grens); if (top > vorige) t += (top - vorige) * tarief; if (grens === null || r <= grens) break; vorige = grens; }
    return Math.round(t * 100) / 100;
  };
  function reken() {
    const r = STAPPEN[+n.value] ?? 0, m = +b.value, jaar = document.querySelector('input[name="samT"]:checked')?.value === "jaar";
    const som = Math.round((regPrijs(r) + Math.max(0, m - 1) * BRON) * 100) / 100;
    const gewoon = som === 0 ? 0 : Math.max(som, MIN);
    const bedrag = jaar ? Math.round(Math.max(gewoon, MIN) * 10 / 12 * 100) / 100 : gewoon;
    $("#samNUit").textContent = r >= 1000000 ? "1 miljoen +" : num(r);
    $("#samBUit").textContent = String(m);
    $("#samBedrag").textContent = bedrag === 0 ? "€ 0" : eur(bedrag);
    let d;
    if (r >= 1000000) d = "Boven een miljoen registraties per maand maken we een offerte op maat.";
    else if (bedrag === 0) d = "Binnen de gratis laag: geen factuur, geen betaalgegevens nodig.";
    else if (jaar) d = `Jaarcontract: ${eur(bedrag)} per maand in plaats van ${eur(Math.max(gewoon, MIN))}, dus ${eur((Math.max(gewoon, MIN) - bedrag) * 12)} voordeel per jaar. Twaalf maanden, maandelijks betaald.`;
    else d = som < MIN ? `Verbruik ${eur(som)}: u betaalt het minimum van € 19. Maandelijks opzegbaar.` : "Naar verbruik, maandelijks opzegbaar.";
    $("#samDetail").textContent = d;
  }
  n.addEventListener("input", reken); b.addEventListener("input", reken);
  document.querySelectorAll('input[name="samT"]').forEach((x) => x.addEventListener("change", reken));
  reken();
})();
