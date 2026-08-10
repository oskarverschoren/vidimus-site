/* DocTracer concept — scroll reveal + live verankering/tamper-demo */
'use strict'

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ── Compacte synchronische SHA-256 (werkt ook op file://) ──── */
function sha256Hex(input) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]

  const bytes = new TextEncoder().encode(input)
  const bitLen = bytes.length * 8
  const padded = new Uint8Array(((bytes.length + 8) >> 6 << 6) + 64)
  padded.set(bytes)
  padded[bytes.length] = 0x80
  new DataView(padded.buffer).setUint32(padded.length - 4, bitLen >>> 0)
  new DataView(padded.buffer).setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000))

  const rotr = (x, n) => (x >>> n) | (x << (32 - n))
  const w = new Int32Array(64)

  for (let off = 0; off < padded.length; off += 64) {
    const view = new DataView(padded.buffer, off, 64)
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(i * 4)
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
    }
    let [a, b, c, d, e, f, g, h] = H
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (S0 + maj) | 0
      h = g; g = f; f = e; e = (d + t1) | 0
      d = c; c = b; b = a; a = (t1 + t2) | 0
    }
    H = [
      (H[0] + a) | 0, (H[1] + b) | 0, (H[2] + c) | 0, (H[3] + d) | 0,
      (H[4] + e) | 0, (H[5] + f) | 0, (H[6] + g) | 0, (H[7] + h) | 0,
    ]
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('')
}

/* ── Scroll reveal ──────────────────────────────────────────── */
const revealables = document.querySelectorAll('.reveal')
if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
  revealables.forEach(el => el.classList.add('is-in'))
} else {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in')
        io.unobserve(entry.target)
      }
    })
  }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' })
  revealables.forEach(el => io.observe(el))
}

/* ── Hero-chip: actuele UTC-tijd ────────────────────────────── */
const utcEl = document.querySelector('[data-utc-now]')
if (utcEl) {
  const now = new Date()
  const pad = n => String(n).padStart(2, '0')
  utcEl.textContent =
    `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ` +
    `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())} UTC`
}

/* ── Tamper-demo ────────────────────────────────────────────── */
const docCard = document.getElementById('doc-card')
const verifyCard = document.getElementById('verify-card')

if (docCard && verifyCard) {
  const fields = [...docCard.querySelectorAll('[data-field]')]
  const pill = document.getElementById('verify-pill')
  const pillText = document.getElementById('verify-pill-text')
  const anchoredEl = document.getElementById('hash-anchored')
  const currentEl = document.getElementById('hash-current')
  const verdictEl = document.getElementById('verify-verdict')
  const resetBtn = document.getElementById('doc-reset')
  const steps = [...verifyCard.querySelectorAll('[data-step]')]

  const STEP_DELAY = REDUCED_MOTION ? 0 : 650
  let anchoredHash = null
  let anchorPlayed = false

  const docString = () => fields.map(f => f.textContent.trim()).join('␟')
  const shortHash = h => `sha256:${h.slice(0, 18)}…${h.slice(-6)}`

  function setPill(state, text) {
    pill.classList.remove('status-pending', 'status-valid', 'status-broken')
    pill.classList.add(state)
    pillText.textContent = text
  }

  function playAnchorSequence() {
    if (anchorPlayed) return
    anchorPlayed = true
    anchoredHash = sha256Hex(docString())
    anchoredEl.textContent = shortHash(anchoredHash)
    currentEl.textContent = shortHash(anchoredHash)

    steps.forEach((li, i) => {
      setTimeout(() => li.classList.add('is-done'), STEP_DELAY * (i + 1))
    })
    setTimeout(() => {
      setPill('status-valid', 'Geldig')
      verdictEl.textContent =
        'Hashes komen overeen. Dit document is sinds de verankering met geen byte gewijzigd.'
    }, STEP_DELAY * (steps.length + 1))
  }

  function verifyNow() {
    if (!anchoredHash) return
    const current = sha256Hex(docString())
    currentEl.textContent = shortHash(current)
    const tampered = current !== anchoredHash

    docCard.classList.toggle('is-tampered', tampered)
    verifyCard.classList.toggle('is-broken', tampered)
    resetBtn.hidden = !tampered

    fields.forEach(f => {
      f.classList.toggle('was-edited', f.textContent.trim() !== f.dataset.original.trim())
    })

    if (tampered) {
      setPill('status-broken', 'Ongeldig')
      verdictEl.textContent =
        'Wijziging gedetecteerd — de huidige hash komt niet overeen met de verankerde hash. ' +
        'Dit document is niet meer het document dat getekend werd.'
    } else {
      setPill('status-valid', 'Geldig')
      verdictEl.textContent =
        'Hashes komen overeen. Dit document is sinds de verankering met geen byte gewijzigd.'
    }
  }

  fields.forEach(f => f.addEventListener('input', verifyNow))

  resetBtn.addEventListener('click', () => {
    fields.forEach(f => { f.textContent = f.dataset.original })
    verifyNow()
  })

  // Start de verankering zodra de sectie in beeld komt
  if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
    playAnchorSequence()
  } else {
    const tamperIO = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        playAnchorSequence()
        tamperIO.disconnect()
      }
    }, { threshold: 0.35 })
    tamperIO.observe(verifyCard)
  }
}
