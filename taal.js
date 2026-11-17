/* 16/11: taalbalk. Een Engelse pagina bij een bezoeker met Nederlands in zijn browsertalen, of een Nederlandse pagina
   bij een bezoeker zonder Nederlands, toont één keer onderaan een kleine balk met een link naar de andere taal
   (de hreflang-alternatief in de kop). Nooit automatisch omleiden. Wegklikken of een taal kiezen onthouden we in
   localStorage; lukt dat niet (privévenster, geblokkeerd), dan werkt de pagina gewoon zonder. */
(function () {
  "use strict";

  const SLEUTEL = "vidimus.taalbalk";
  const TEKST = {
    en: { lang: "nl", hreflang: "nl-BE", regio: "Taal", link: "Deze pagina bestaat in het Nederlands", sluit: "Sluiten" },
    nl: { lang: "en", hreflang: "en", regio: "Language", link: "This page is available in English", sluit: "Close" }
  };

  const lees = () => { try { return localStorage.getItem(SLEUTEL); } catch (e) { return null; } };
  const bewaar = () => { try { localStorage.setItem(SLEUTEL, "1"); } catch (e) { /* geen opslag: de balk komt dan terug */ } };

  // wie zelf een taal kiest in de kop of de voet, krijgt de balk niet meer
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a.top-taal, .app-voet .taal a");
    if (a) bewaar();
  });

  if (/VidimusApp/.test(navigator.userAgent)) return;   // in de app geen balk: daar staat de terugknop onderaan
  const pagina = (document.documentElement.lang || "").toLowerCase().slice(0, 2);
  const t = TEKST[pagina];
  if (!t || lees()) return;

  const talen = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ""];
  const spreektNl = Array.prototype.some.call(talen, (l) => /^nl(-|$)/i.test(l || ""));
  if (pagina === "en" ? !spreektNl : spreektNl) return;

  const alt = document.querySelector('link[rel="alternate"][hreflang="' + t.hreflang + '"]');
  if (!alt || !alt.getAttribute("href")) return;
  let doel = alt.href;
  try {
    // zelfde pad op dezelfde host, zodat een lokale kopie of testomgeving niet naar de live site springt
    const u = new URL(alt.href);
    if (location.protocol === "http:" || location.protocol === "https:") doel = location.origin + u.pathname;
  } catch (e) { /* gewoon de href uit de kop */ }
  if (doel === location.origin + location.pathname) return;

  const stil = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const balk = document.createElement("div");
  balk.className = "taalbalk";
  balk.setAttribute("role", "region");
  balk.setAttribute("aria-label", t.regio);
  balk.lang = t.lang;

  const link = document.createElement("a");
  link.href = doel;
  link.hreflang = t.hreflang;
  link.textContent = t.link;
  // script.js zet links buiten kop en voet bij de klik op een nieuw tabblad; de taalwissel blijft in hetzelfde tabblad
  link.addEventListener("click", () => { link.removeAttribute("target"); bewaar(); });

  const knop = document.createElement("button");
  knop.type = "button";
  knop.setAttribute("aria-label", t.sluit);
  knop.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

  const weg = () => {
    bewaar();
    const hadFocus = balk.contains(document.activeElement);
    const klaar = () => balk.remove();
    if (stil) klaar();
    else { balk.classList.remove("is-in"); balk.addEventListener("transitionend", klaar, { once: true }); setTimeout(klaar, 400); }
    if (hadFocus) { const main = document.querySelector("main"); if (main) { main.setAttribute("tabindex", "-1"); main.focus({ preventScroll: true }); } }
  };
  knop.addEventListener("click", weg);
  balk.addEventListener("keydown", (e) => { if (e.key === "Escape") weg(); });

  balk.append(link, knop);
  document.body.append(balk);
  if (stil) balk.classList.add("is-in");
  else requestAnimationFrame(() => requestAnimationFrame(() => balk.classList.add("is-in")));
})();
