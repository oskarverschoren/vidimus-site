/* Vidimus · homepage (home2.js, 27/10/2026): menu, wisselende voorbeelden in de invoer, de vraag naar de aanmelding,
   mini-demo "Vervals het". Geen inline handlers; script.js blijft de gedeelde regels doen (terug.js in de app, nieuw tabblad). */
(() => {
  'use strict';

  /* ── de vraag in de held → een categorie voor de aanmelding (Oskar 27/10, keuze 2) ──
     Alleen de categorie gaat mee in de adresbalk, nooit de getypte tekst. Volgorde telt: de eerste regel die past, wint.
     Elk trefwoord moet aan het begin van een woord staan ("afgiftestaat" is een afgifte, geen staat). */
  const WAT_REGELS = Object.freeze([
    ['leveringen', ['levering', 'lever', 'aflever', 'cmr', 'palet', 'vracht', 'zending', 'colli']],
    ['fotos', ['foto', 'schade', 'deuk', 'inspectie', 'staat', 'kras']],
    ['documenten', ['contract', 'document', 'factuur', 'pdf', 'webpagina', 'website', 'pagina', 'voorwaarden', 'offerte']],
    ['overdrachten', ['sleutel', 'overdracht', 'afgifte', 'huur', 'verhuur', 'overhandig']],
  ]);
  // 16/11: dezelfde categorieën voor wie in het Engels typt (zoals en/home-en.js); de waarden blijven Nederlands, de app verwacht ze zo
  const WAT_REGELS_EN = Object.freeze([
    ['leveringen', ['deliver', 'cmr', 'pallet', 'freight', 'shipment', 'consignment', 'parcel', 'load']],
    ['fotos', ['photo', 'picture', 'damage', 'dent', 'inspection', 'condition', 'scratch']],
    ['documenten', ['contract', 'document', 'invoice', 'pdf', 'webpage', 'website', 'web', 'page', 'terms', 'quote']],
    ['overdrachten', ['key', 'handover', 'hand', 'rental', 'rent', 'lease']],
  ]);
  const maakCategorie = (regels) => (tekst) => {
    const t = String(tekst || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (!t) return '';
    const woorden = t.split(/[^a-z0-9]+/).filter(Boolean);
    for (const [cat, trefwoorden] of regels) {
      if (woorden.some((w) => trefwoorden.some((k) => w.startsWith(k)))) return cat;
    }
    return 'anders';
  };
  const watCategorie = maakCategorie(WAT_REGELS);
  if (typeof document === 'undefined') { module.exports = { watCategorie }; return; }   // tests/test_home2_wat.py (node)

  // 16/11: op een Engelse pagina (<html lang="en">) Engelse teksten; Nederlands ongewijzigd
  const EN = /^en\b/i.test(document.documentElement.lang || '');
  const categorie = EN ? maakCategorie(WAT_REGELS_EN) : watCategorie;
  const T = Object.freeze(EN ? {
    menuSluiten: 'Close menu', menuOpenen: 'Open menu', ongewijzigd: 'unchanged', gewijzigd: 'changed',
    zinAf: 'This content does not match the anchor. Vidimus says no more than that: not what changed, not by whom.',
    geenCrypto: 'Web Crypto is not available here (https only).',
  } : {
    menuSluiten: 'Menu sluiten', menuOpenen: 'Menu openen', ongewijzigd: 'ongewijzigd', gewijzigd: 'gewijzigd',
    zinAf: 'Deze inhoud komt met het anker niet overeen. Meer zegt Vidimus niet: niet wat er veranderde, niet door wie.',
    geenCrypto: 'Web Crypto is hier niet beschikbaar (alleen via https).',
  });

  const IN_APP = /VidimusApp/.test(navigator.userAgent);
  const WISSEL_MS = 2800;
  const VERVAAG_MS = 220;
  const VOORBEELDEN = Object.freeze(EN ? [
    'a delivery of 26 pallets',
    'the condition of a rented home',
    'a web page before it disappears',
    'the temperature in the cold store',
    'extra work that was approved',
    'the version of a contract',
    'the state of a database',
  ] : [
    'een levering van 26 paletten',
    'de staat van een huurwoning',
    'een webpagina vóór ze verdwijnt',
    'de temperatuur in de koelcel',
    'meerwerk dat werd goedgekeurd',
    'de versie van een contract',
    'de stand van een databank',
  ]);
  const zachteBeweging = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── kop: menu + schaduw bij scrollen ─────────────────────── */
  const kop = document.querySelector('.kop');
  const menuKnop = document.querySelector('.kop-menu');
  const menu = document.getElementById('menu');
  const zetMenu = (open) => {
    if (!menuKnop || !menu) return;
    menuKnop.setAttribute('aria-expanded', String(open));
    menuKnop.setAttribute('aria-label', open ? T.menuSluiten : T.menuOpenen);
    menu.hidden = !open;
  };
  if (menuKnop && menu) {
    menuKnop.addEventListener('click', () => zetMenu(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) zetMenu(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { zetMenu(false); menuKnop.focus(); } });
  }
  if (kop && 'IntersectionObserver' in window) {
    const wacht = document.createElement('div');
    wacht.setAttribute('aria-hidden', 'true');
    document.body.prepend(wacht);
    new IntersectionObserver(([e]) => kop.classList.toggle('gescrold', !e.isIntersecting)).observe(wacht);
  }

  /* ── invoer: voorbeelden wisselen als placeholder ─────────── */
  document.querySelectorAll('input[data-wissel]').forEach((veld, n) => {
    let i = Math.max(0, VOORBEELDEN.indexOf(veld.placeholder));
    if (zachteBeweging) return;
    const wissel = () => {
      if (document.hidden || veld.value || document.activeElement === veld) return;
      veld.classList.add('wissel-uit');
      window.setTimeout(() => {
        i = (i + 1) % VOORBEELDEN.length;
        veld.placeholder = VOORBEELDEN[i];
        veld.classList.remove('wissel-uit');
      }, VERVAAG_MS);
    };
    window.setTimeout(() => window.setInterval(wissel, WISSEL_MS), n * 700);
  });

  /* ── de vraag: ?wat=<categorie> naar /aanmelden; buiten de app in een nieuw tabblad (zoals elke knop, 01/10) ── */
  document.querySelectorAll('form[data-vraag]').forEach((form) => {
    const veld = form.querySelector('input[type="text"]');
    const wat = form.querySelector('input[name="wat"]');
    if (!IN_APP) { form.target = '_blank'; form.rel = 'noopener'; }
    form.addEventListener('submit', () => {
      if (!wat) return;
      const cat = categorie(veld ? veld.value : '');
      wat.value = cat;
      wat.disabled = !cat;
    });
  });

  /* ── mini-demo: echte SHA-256 in de browser ───────────────────
     Dezelfde vijf velden en dezelfde vingerafdruk als de vervals-demo op /techniek ("Vingerafdruk fa6ca8ec…"):
     tekst getrimd, met '|' verbonden. */
  const demo = document.querySelector('[data-demo]');
  if (!demo) return;
  const aantal = demo.querySelector('#demoAantal');
  const knop23 = demo.querySelector('[data-demo-23]');
  const knopReset = demo.querySelector('[data-demo-reset]');
  const st = demo.querySelector('[data-demo-st]');
  const zin = demo.querySelector('[data-demo-zin]');
  const ankerEl = demo.querySelector('[data-demo-anker]');
  const nuEl = demo.querySelector('[data-demo-nu]');
  const velden = Array.from(demo.querySelectorAll('[data-f]'));
  if (!aantal || !knop23 || !knopReset || !st || !zin || !ankerEl || !nuEl || velden.length !== 5) return;
  const ORIGINEEL = aantal.defaultValue;
  const ZIN_OK = zin.textContent;
  const ZIN_AF = T.zinAf;

  const veldTekst = (dd) => {
    const inv = dd.querySelector('input');
    if (!inv) return dd.textContent.trim();
    const rest = Array.from(dd.childNodes).filter((k) => k !== inv).map((k) => k.textContent).join('');
    return `${inv.value.trim()} ${rest.trim()}`.trim();
  };
  const inhoud = () => velden.map(veldTekst).join('|');
  const sha256 = async (tekst) => {
    if (!window.crypto || !window.crypto.subtle) throw new Error(T.geenCrypto);
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tekst));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
  };

  let anker = '';
  const toon = async () => {
    try {
      const nu = await sha256(inhoud());
      const gelijk = nu === anker;
      nuEl.textContent = nu;
      nuEl.classList.toggle('af', !gelijk);
      st.textContent = gelijk ? T.ongewijzigd : T.gewijzigd;
      st.classList.toggle('af', !gelijk);
      zin.textContent = gelijk ? ZIN_OK : ZIN_AF;
      demo.classList.toggle('is-af', !gelijk);
      knopReset.hidden = gelijk;
      knop23.hidden = !gelijk;
    } catch (err) {
      nuEl.textContent = err.message;
    }
  };
  sha256(inhoud())
    .then((h) => { anker = h; ankerEl.textContent = h; return toon(); })
    .catch((err) => { ankerEl.textContent = err.message; nuEl.textContent = ''; });

  aantal.addEventListener('input', toon);
  knop23.addEventListener('click', () => { aantal.value = '23'; toon(); });
  knopReset.addEventListener('click', () => { aantal.value = ORIGINEEL; toon(); aantal.focus(); });
})();
