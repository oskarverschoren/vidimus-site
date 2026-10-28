/* Vidimus · English homepage (27/10/2026, branch seo-1, draft). Same behaviour as home2.js on the Dutch homepage:
   menu, rotating examples in the input, the question → a category for sign-up, mini demo "Try to forge it".
   Kept separate because every visible string differs; the category values stay Dutch because the app expects them. */
(() => {
  'use strict';

  /* Only the category travels in the address bar, never the typed text. First matching rule wins;
     each keyword must start a word. */
  const WAT_REGELS = Object.freeze([
    ['leveringen', ['deliver', 'cmr', 'pallet', 'freight', 'shipment', 'consignment', 'parcel', 'load']],
    ['fotos', ['photo', 'picture', 'damage', 'dent', 'inspection', 'condition', 'scratch']],
    ['documenten', ['contract', 'document', 'invoice', 'pdf', 'webpage', 'website', 'web', 'page', 'terms', 'quote']],
    ['overdrachten', ['key', 'handover', 'hand', 'rental', 'rent', 'lease']],
  ]);
  const watCategorie = (tekst) => {
    const t = String(tekst || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    if (!t) return '';
    const woorden = t.split(/[^a-z0-9]+/).filter(Boolean);
    for (const [cat, trefwoorden] of WAT_REGELS) {
      if (woorden.some((w) => trefwoorden.some((k) => w.startsWith(k)))) return cat;
    }
    return 'anders';
  };
  if (typeof document === 'undefined') { module.exports = { watCategorie }; return; }

  const IN_APP = /VidimusApp/.test(navigator.userAgent);
  const WISSEL_MS = 2800;
  const VERVAAG_MS = 220;
  const VOORBEELDEN = Object.freeze([
    'a delivery of 26 pallets',
    'the condition of a rented home',
    'a web page before it disappears',
    'the temperature in the cold store',
    'extra work that was approved',
    'the version of a contract',
    'the state of a database',
  ]);
  const zachteBeweging = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header: menu + shadow on scroll */
  const kop = document.querySelector('.kop');
  const menuKnop = document.querySelector('.kop-menu');
  const menu = document.getElementById('menu');
  const zetMenu = (open) => {
    if (!menuKnop || !menu) return;
    menuKnop.setAttribute('aria-expanded', String(open));
    menuKnop.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
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

  /* input: rotating examples as placeholder */
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

  /* the question: ?wat=<category> to /aanmelden; outside the app in a new tab */
  document.querySelectorAll('form[data-vraag]').forEach((form) => {
    const veld = form.querySelector('input[type="text"]');
    const wat = form.querySelector('input[name="wat"]');
    if (!IN_APP) { form.target = '_blank'; form.rel = 'noopener'; }
    form.addEventListener('submit', () => {
      if (!wat) return;
      const cat = watCategorie(veld ? veld.value : '');
      wat.value = cat;
      wat.disabled = !cat;
    });
  });

  /* mini demo: real SHA-256 in the browser (five fields, trimmed, joined with '|') */
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
  const ZIN_AF = 'This content does not match the anchor. Vidimus says no more than that: not what changed, not by whom.';

  const veldTekst = (dd) => {
    const inv = dd.querySelector('input');
    if (!inv) return dd.textContent.trim();
    const rest = Array.from(dd.childNodes).filter((k) => k !== inv).map((k) => k.textContent).join('');
    return `${inv.value.trim()} ${rest.trim()}`.trim();
  };
  const inhoud = () => velden.map(veldTekst).join('|');
  const sha256 = async (tekst) => {
    if (!window.crypto || !window.crypto.subtle) throw new Error('Web Crypto is not available here (https only).');
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
      st.textContent = gelijk ? 'unchanged' : 'changed';
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
