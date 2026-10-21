// Mede o tempo do `fit` nos 13 tamanhos de referência (mediana de 7 rodadas, em ms).
// Uso: npm run bench
import { buildCfg } from "../src/sistema-solar/config.js";
import { fit } from "../src/sistema-solar/layout.js";

const TAMANHOS = [
  [1100, 640],
  [1200, 700],
  [1280, 720],
  [1340, 690],
  [1440, 900],
  [1536, 864],
  [1920, 1080],
  [766, 878],
  [1024, 768],
  [820, 1180],
  [900, 900],
  [600, 480],
  [800, 367],
];
const RODADAS = 7;
const cfg = buildCfg({});
const cwOf = (/** @type {number} */ fs) => fs * 0.6;
let total = 0;
console.log("tamanho     ok     fonte  mediana(ms)");
for (const [W, H] of TAMANHOS) {
  const tempos = [];
  let r;
  for (let i = 0; i < RODADAS; i++) {
    const t0 = performance.now();
    r = fit(cfg, 22, W, H, cwOf);
    tempos.push(performance.now() - t0);
  }
  tempos.sort((a, b) => a - b);
  const med = tempos[RODADAS >> 1];
  total += med;
  console.log(
    `${`${W}x${H}`.padEnd(11)} ${String(r?.ok).padEnd(6)} ${String(r?.L.fs).padEnd(6)} ${med.toFixed(1)}`,
  );
}
console.log(`soma das medianas: ${total.toFixed(1)} ms`);
