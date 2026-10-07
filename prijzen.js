/* Rekenhulp op /prijzen (07/10/2026): zonder formulier, meteen ingevuld, live. Rekent met prijs.js, dezelfde rekensom als de
   facturatie en als de aanmelding in de app. Er wordt niets opgeslagen of verstuurd. */
"use strict";
(() => {
  const P = window.VPRIJS;
  const $ = (s) => document.querySelector(s);
  if (!P || !$("#reken")) return;
  const aantal = (n) => n.toLocaleString("nl-BE").replace(/\./g, " ");
  const eur = (x) => P.eur(x).replace(/\./g, " ");   // duizendtallen met een smalle spatie, zoals elders op de site
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
    $("#rPer").textContent = gratis ? "per maand: binnen het gratis deel" : metJaar ? "per maand, vast voor 12 maanden" : "per maand";
    let r = rij(`${aantal(n)} registraties${n <= P.GRATIS ? "" : `, de eerste ${P.GRATIS} gratis`}`, eur(s.registraties));
    if (b) r += rij(`${aantal(b)} ${b === 1 ? "sensor of logger" : "sensoren of loggers"}, de eerste gratis`, eur(s.toestellen));
    if (s.minimum) r += rij(`Aangevuld tot het minimum van ${eur(P.MINIMUM)}`, `+ ${eur(Math.round((P.MINIMUM - s.som) * 100) / 100)}`);
    if (metJaar) r += rij("Jaarcontract, 2 maanden gratis", `− ${eur(Math.round((s.maand - s.jaar) * 100) / 100)}`);
    $("#rRegels").innerHTML = r;
    $("#rNoot").textContent = s.offerte ? "Boven een miljoen registraties per maand maken we samen een offerte."
      : metJaar ? `U bespaart ${eur(Math.round((s.maand - s.jaar) * 12))} per jaar. Meer gebruik wordt per kwartaal verrekend.`
      : jaar && gratis ? "Binnen het gratis deel heeft een jaarcontract geen zin." : "Een schatting. U betaalt altijd wat u echt gebruikt.";
    const tekst = `Dag Oskar,\n\nGraag een offerte voor deze samenstelling:\n- Registraties per maand: ${n}\n- Sensoren of loggers: ${b}\n- Contract: ${metJaar ? "jaarcontract" : "per maand"}\n- Richtprijs: ${$("#rBedrag").textContent} per maand, excl. btw\n\nMijn bedrijf en telefoonnummer:\n`;
    $("#rMail").href = `mailto:oskar@vo-initiatives.com?subject=${encodeURIComponent(`Offerte Vidimus: ${n} registraties, ${b} sensoren`)}&body=${encodeURIComponent(tekst)}`;
  }
  ["#rN", "#rB", "#rJ"].forEach((s) => $(s).addEventListener("input", reken));
  $("#rJ").addEventListener("change", reken);
  document.querySelectorAll(".pz-chips button").forEach((k) => k.addEventListener("click", () => { $(`#${k.parentElement.dataset.voor}`).value = k.dataset.v; reken(); }));
  reken();
})();
