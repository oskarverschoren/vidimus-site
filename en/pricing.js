/* Calculator on /en/pricing (27/10/2026, branch seo-1, draft). Same arithmetic as /prijzen: it calls window.VPRIJS from
   ../prijs.js, the single source of truth shared with billing (vidimus/billing.py). Only the wording and the number format
   differ. Nothing is stored or sent. */
"use strict";
(() => {
  const P = window.VPRIJS;
  const $ = (s) => document.querySelector(s);
  if (!P || !$("#reken")) return;
  const aantal = (n) => n.toLocaleString("en-GB");
  const eur = (x) => "€" + x.toLocaleString("en-GB", { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const getal = (el, hi) => { const n = Math.round(Number(el.value)); return Number.isFinite(n) ? Math.max(0, Math.min(hi, n)) : 0; };
  const rij = (dt, dd) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`;
  const centen = (x) => Math.round(x * 100) / 100;

  function reken() {
    const n = getal($("#rN"), 5000000), b = getal($("#rB"), 10000), jaar = $("#rJ").checked;
    const s = P.schatting(n, b), gratis = s.maand === 0;
    document.querySelectorAll(".pz-chips").forEach((c) => {
      const v = String(getal($(`#${c.dataset.voor}`), 1e9));
      c.querySelectorAll("button").forEach((k) => { const aan = k.dataset.v === v; k.classList.toggle("cur", aan); k.setAttribute("aria-pressed", aan); });
    });
    const metJaar = jaar && !gratis && !s.offerte;
    $("#rBedrag").textContent = eur(metJaar ? s.jaar : s.maand);
    $("#rPer").textContent = gratis ? "a month: within the free tier" : metJaar ? "a month, fixed for 12 months" : "a month";
    let r = rij(`${aantal(n)} records${n <= P.GRATIS ? "" : `, the first ${P.GRATIS} free`}`, eur(s.registraties));
    if (b) r += rij(`${aantal(b)} ${b === 1 ? "sensor or logger" : "sensors or loggers"}, the first free`, eur(s.toestellen));
    if (s.minimum) r += rij(`Topped up to the minimum of ${eur(P.MINIMUM)}`, `+ ${eur(centen(P.MINIMUM - s.som))}`);
    if (metJaar) r += rij("Annual contract, 2 months free", `− ${eur(centen(s.maand - s.jaar))}`);
    $("#rRegels").innerHTML = r;
    $("#rNoot").textContent = s.offerte ? "Above one million records a month, we prepare a quote together."
      : metJaar ? `You save ${eur(Math.round((s.maand - s.jaar) * 12))} a year. Extra use is settled each quarter.`
      : jaar && gratis ? "Within the free tier, an annual contract makes no sense." : "An estimate. You always pay for what you actually use.";
    const tekst = `Hello Oskar,\n\nPlease send me a quote for this set-up:\n- Records per month: ${n}\n- Sensors or loggers: ${b}\n- Contract: ${metJaar ? "annual contract" : "monthly"}\n- Indicative price: ${$("#rBedrag").textContent} a month, excl. VAT\n\nMy company and phone number:\n`;
    $("#rMail").href = `mailto:oskar@vo-initiatives.com?subject=${encodeURIComponent(`Vidimus quote: ${n} records, ${b} sensors`)}&body=${encodeURIComponent(tekst)}`;
  }
  ["#rN", "#rB", "#rJ"].forEach((s) => $(s).addEventListener("input", reken));
  $("#rJ").addEventListener("change", reken);
  document.querySelectorAll(".pz-chips button").forEach((k) => k.addEventListener("click", () => { $(`#${k.parentElement.dataset.voor}`).value = k.dataset.v; reken(); }));
  reken();
})();
