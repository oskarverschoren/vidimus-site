/* Calculator on /pricing.html (27/10/2026, branch seo-1). Same arithmetic as /prijzen: it calls window.VPRIJS from prijs.js,
   the single source of truth shared with billing (vidimus/billing.py). Nothing is stored or sent.
   16/11: bilingual, the same code as ../prijzen.js (English for <html lang="en">, Dutch otherwise). Keep both files identical
   below this comment; once pricing.html loads prijzen.js, this file can go. */
"use strict";
(() => {
  const P = window.VPRIJS;
  const $ = (s) => document.querySelector(s);
  if (!P || !$("#reken")) return;
  const EN = /^en\b/i.test(document.documentElement.lang || "");
  const aantal = EN ? (n) => n.toLocaleString("en-GB") : (n) => n.toLocaleString("nl-BE").replace(/\./g, " ");
  const eur = EN
    ? (x) => "€" + x.toLocaleString("en-GB", { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 })
    : (x) => P.eur(x).replace(/\./g, " ");   // duizendtallen met een smalle spatie, zoals elders op de site
  const T = Object.freeze(EN ? {
    gratisDeel: "a month: within the free tier", vastJaar: "a month, fixed for 12 months", perMaand: "a month",
    reg: (n, g) => `${n} records${g ? `, the first ${g} free` : ""}`,
    bron: (n, b) => `${n} ${b === 1 ? "sensor or logger" : "sensors or loggers"}, the first free`,
    minimum: (m) => `Topped up to the minimum of ${m}`, jaar: "Annual contract, 2 months free",
    offerte: "Above one million records a month, we prepare a quote together.",
    bespaart: (x) => `You save ${x} a year. Extra use is settled each quarter.`,
    geenZin: "Within the free tier, an annual contract makes no sense.", schatting: "An estimate. You always pay for what you actually use.",
    mail: (n, b, jaar, prijs) => `Hello Oskar,\n\nPlease send me a quote for this set-up:\n- Records per month: ${aantal(n)}\n- Sensors or loggers: ${aantal(b)}\n- Contract: ${jaar ? "annual contract" : "monthly"}\n- Indicative price: ${prijs} a month, excl. VAT\n\nMy company and phone number:\n`,
    onderwerp: (n, b) => `Vidimus quote: ${aantal(n)} records, ${aantal(b)} ${b === 1 ? "sensor" : "sensors"}`,
  } : {
    gratisDeel: "per maand: binnen het gratis deel", vastJaar: "per maand, vast voor 12 maanden", perMaand: "per maand",
    reg: (n, g) => `${n} registraties${g ? `, de eerste ${g} gratis` : ""}`,
    bron: (n, b) => `${n} ${b === 1 ? "sensor of logger" : "sensoren of loggers"}, de eerste gratis`,
    minimum: (m) => `Aangevuld tot het minimum van ${m}`, jaar: "Jaarcontract, 2 maanden gratis",
    offerte: "Boven een miljoen registraties per maand maken we samen een offerte.",
    bespaart: (x) => `U bespaart ${x} per jaar. Meer gebruik wordt per kwartaal verrekend.`,
    geenZin: "Binnen het gratis deel heeft een jaarcontract geen zin.", schatting: "Een schatting. U betaalt altijd wat u echt gebruikt.",
    mail: (n, b, jaar, prijs) => `Dag Oskar,\n\nGraag een offerte voor deze samenstelling:\n- Registraties per maand: ${n}\n- Sensoren of loggers: ${b}\n- Contract: ${jaar ? "jaarcontract" : "per maand"}\n- Richtprijs: ${prijs} per maand, excl. btw\n\nMijn bedrijf en telefoonnummer:\n`,
    onderwerp: (n, b) => `Offerte Vidimus: ${n} registraties, ${b} sensoren`,
  });
  const getal = (el, hi) => { const n = Math.round(Number(el.value)); return Number.isFinite(n) ? Math.max(0, Math.min(hi, n)) : 0; };
  const rij = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;

  function reken() {
    const n = getal($("#rN"), 5000000), b = getal($("#rB"), 10000), jaar = $("#rJ").checked;
    const s = P.schatting(n, b), gratis = s.maand === 0;
    document.querySelectorAll(".pz-chips").forEach((c) => {
      const v = String(getal($(`#${c.dataset.voor}`), 1e9));
      c.querySelectorAll("button").forEach((k) => { const aan = k.dataset.v === v; k.classList.toggle("cur", aan); k.setAttribute("aria-pressed", aan); });
    });
    const metJaar = jaar && !gratis && !s.offerte;
    $("#rBedrag").textContent = eur(metJaar ? s.jaar : s.maand);
    $("#rPer").textContent = gratis ? T.gratisDeel : metJaar ? T.vastJaar : T.perMaand;
    let r = rij(T.reg(aantal(n), n <= P.GRATIS ? 0 : P.GRATIS), eur(s.registraties));
    if (b) r += rij(T.bron(aantal(b), b), eur(s.toestellen));
    if (s.minimum) r += rij(T.minimum(eur(P.MINIMUM)), `+ ${eur(Math.round((P.MINIMUM - s.som) * 100) / 100)}`);
    if (metJaar) r += rij(T.jaar, `− ${eur(Math.round((s.maand - s.jaar) * 100) / 100)}`);
    $("#rRegels").innerHTML = r;
    $("#rNoot").textContent = s.offerte ? T.offerte
      : metJaar ? T.bespaart(eur(Math.round((s.maand - s.jaar) * 12)))
      : jaar && gratis ? T.geenZin : T.schatting;
    const tekst = T.mail(n, b, metJaar, $("#rBedrag").textContent);
    $("#rMail").href = `mailto:oskar@vo-initiatives.com?subject=${encodeURIComponent(T.onderwerp(n, b))}&body=${encodeURIComponent(tekst)}`;
  }
  ["#rN", "#rB", "#rJ"].forEach((s) => $(s).addEventListener("input", reken));
  $("#rJ").addEventListener("change", reken);
  document.querySelectorAll(".pz-chips button").forEach((k) => k.addEventListener("click", () => { $(`#${k.parentElement.dataset.voor}`).value = k.dataset.v; reken(); }));
  reken();
})();
