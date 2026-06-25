// host.js — the GENERIC host (embedded into the server binary at build time). It
// is app-agnostic: instantiate the wasm, wire the reactive runtime's DOM ops, seed
// from the SSR page, hydrate, and forward clicks. Adding components changes only
// the MFL — this file rarely changes.
const dec = new TextDecoder();
let mem;
const cstr = (p) => { const b = new Uint8Array(mem.buffer); let e = p; while (b[e]) e++; return dec.decode(b.subarray(p, e)); };

const env = {
  // reactive runtime → DOM
  dom_mount: (r, h) => { document.getElementById(cstr(r)).innerHTML = cstr(h); },
  dom_patch: (s, v) => { const el = document.querySelector('[data-s="' + cstr(s) + '"]'); if (el) el.textContent = cstr(v); },
  list_insert: (c, k, h) => { const li = document.createElement('li'); li.dataset.k = cstr(k); li.innerHTML = cstr(h); document.getElementById(cstr(c)).appendChild(li); },
  list_remove: (c, k) => { const el = document.querySelector('#' + cstr(c) + ' > [data-k="' + cstr(k) + '"]'); if (el) el.remove(); },
  list_order: (c, csv) => { const cont = document.getElementById(cstr(c)); for (const k of cstr(csv).split(',').filter(Boolean)) { const el = cont.querySelector('[data-k="' + k + '"]'); if (el) cont.appendChild(el); } },
  // app effects
  api_vote: (i) => { fetch('/api/vote?o=' + i, { method: 'POST' }); },
};
// no-op WASI shim (imported but never called — see README)
const wasi = { fd_write: () => 0, fd_seek: () => 0, fd_close: () => 0, fd_fdstat_get: () => 0 };

const { instance } = await WebAssembly.instantiateStreaming(fetch('/app.wasm'), { env, wasi_snapshot_preview1: wasi });
mem = instance.exports.memory;
instance.exports._initialize?.();

// seed the client's state from the server-rendered counts, then hydrate.
const seed = window.__SEED || [];
for (let i = 0; i < seed.length; i++) instance.exports.seed(BigInt(i), BigInt(seed[i]));
instance.exports.start();

// delegate clicks: a [data-opt] button votes for that option.
document.getElementById('app').addEventListener('click', (e) => {
  const b = e.target.closest('[data-opt]');
  if (b) instance.exports.vote(BigInt(b.dataset.opt));
});
