/* Prijs per maand, zelfde rekensom als vidimus/billing.py en jaarcontract.py (07/10/2026). tests/test_aanmelden_flow.py
   vergelijkt beide: verandert de prijs in billing.py, dan faalt die test tot dit bestand mee is. */
"use strict";
window.VPRIJS = (() => {
  const GRATIS = 100;
  const SCHIJVEN = [[3000, 0.08], [10000, 0.04], [100000, 0.01], [null, 0.003]];   // [bovengrens, prijs per registratie]
  const BRON = 15, GRATIS_BRONNEN = 1, MINIMUM = 19, OFFERTE_VANAF = 1000000;
  const JAAR = 10 / 12;   // jaarcontract: tien maanden betalen voor twaalf
  const rond = (x) => Math.round(x * 100) / 100;

  /** @param {number} n registraties per maand */
  function registraties(n) {
    if (n <= GRATIS) return 0;
    let totaal = 0, vorige = GRATIS;
    for (const [grens, tarief] of SCHIJVEN) {
      const top = grens === null ? n : Math.min(n, grens);
      if (top > vorige) totaal += (top - vorige) * tarief;
      if (grens === null || n <= grens) break;
      vorige = grens;
    }
    return rond(totaal);
  }
  /** @param {number} b sensoren of loggers */
  const toestellen = (b) => rond(Math.max(0, b - GRATIS_BRONNEN) * BRON);

  /** @returns {{registraties:number, toestellen:number, som:number, maand:number, minimum:boolean, jaar:number, offerte:boolean}} */
  function schatting(n, b) {
    const r = registraties(n), t = toestellen(b), som = rond(r + t);
    const maand = som === 0 ? 0 : Math.max(som, MINIMUM);
    return { registraties: r, toestellen: t, som, maand, minimum: som > 0 && som < MINIMUM, jaar: rond(maand * JAAR), offerte: n > OFFERTE_VANAF };
  }
  /** bv. € 32 of € 1 234,50 */
  const eur = (x) => "€ " + x.toLocaleString("nl-BE", { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return { schatting, registraties, toestellen, eur, GRATIS, GRATIS_BRONNEN, BRON, MINIMUM, SCHIJVEN };
})();
