/* Prijs per maand, zelfde rekensom als vidimus/billing.py en jaarcontract.py (07/10/2026). tests/test_aanmelden_flow.py
   vergelijkt beide: verandert de prijs in billing.py, dan faalt die test tot dit bestand mee is.
   30/10/2026 (pakket D, Vidimus Data): de prijs van een momentopname-reeks per maand naar de grootste momentopname (billing.DATA_SCHIJVEN,
   tests/test_prijs_data.py). Staat los van schatting(): die blijft rekenen zoals voorheen. */
"use strict";
window.VPRIJS = (() => {
  const GRATIS = 100;
  const SCHIJVEN = [[3000, 0.08], [10000, 0.04], [100000, 0.01], [null, 0.003]];   // [bovengrens, prijs per registratie]
  const BRON = 15, GRATIS_BRONNEN = 1, MINIMUM = 19, OFFERTE_VANAF = 1000000;
  const JAAR = 10 / 12;   // jaarcontract: tien maanden betalen voor twaalf
  const DATA_SCHIJVEN = [[100000, 49], [5000000, 149], [null, 399]];   // [bovengrens inbegrepen, prijs per reeks per maand]
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
  /** @param {number} aantal rijen of bestanden in de grootste momentopname van de maand */
  const reeks = (aantal) => DATA_SCHIJVEN.find(([grens]) => grens === null || aantal <= grens)[1];
  /** jaarcontract: tien maanden voor twaalf, per reeks per jaar (€ 490 / € 1 490 / € 3 990) */
  const reeksJaar = (aantal) => rond(reeks(aantal) * 12 * JAAR);
  /** bv. € 32 of € 1 234,50 */
  const eur = (x) => "€ " + x.toLocaleString("nl-BE", { minimumFractionDigits: x % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return { schatting, registraties, toestellen, reeks, reeksJaar, eur, GRATIS, GRATIS_BRONNEN, BRON, MINIMUM, SCHIJVEN, DATA_SCHIJVEN };
})();
