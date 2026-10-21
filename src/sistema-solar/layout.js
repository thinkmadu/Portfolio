// Encaixe do sistema solar na caixa W x H sem nada sobreposto.
// `layout` posiciona tudo para uma fonte e uma escala; `staticConflict` e `pickPhases`
// conferem o movimento inteiro antes de desenhar; `fit` procura a maior fonte que cabe.
// O resultado tem de ser idêntico ao do código original: tests/layout.test.js confere.

import { QB, QM, at, boxOf, gcd, halfBox, inside, ov } from "./geometria.js";

/** Fases candidatas (graus) para a órbita de fora, em ordem de preferência. */
const CAND = [0, 30, 330, 60, 300, 90, 270, 120, 240, 150, 210, 180];

/** Posição dos nós da constelação, em fração da meia caixa (x, y), conforme quantos nós há. */
const NODE_POS = [
  [[0.8, 0.5]],
  [
    [-0.85, -0.5],
    [0.85, 0.55],
  ],
  [
    [-0.85, -0.5],
    [0.85, 0.55],
    [0.05, -0.9],
  ],
  [
    [-0.85, -0.5],
    [0.85, 0.55],
    [0.05, -0.9],
    [-0.1, 0.9],
  ],
];

/**
 * @typedef {{ t: string, a: number, rotulo: string, href: string, atual: boolean }} PlanetaCfg
 * @typedef {{ T: number, inner: boolean, pl: PlanetaCfg[] }} OrbitaCfg
 * @typedef {{ sunM: string, nodes: PlanetaCfg[] }} ConstelacaoCfg
 * @typedef {{ big: OrbitaCfg[], cons: ConstelacaoCfg | null, sunG: string, sig: string[] | null }} Cfg
 *
 * @typedef {{ t: string, a: number, rotulo: string, href: string, atual: boolean, w: number, h: number }} Planeta
 * @typedef {{ off: number, cx: number, cy: number, rx: number, ry: number, T: number, pl: Planeta[] }} Orbita
 * @typedef {{ cx: number, cy: number, w: number, h: number }} Caixa
 * @typedef {Caixa & { t: string, rotulo: string, href: string, atual: boolean }} No
 * @typedef {{ cx: number, cy: number, rx: number, ry: number, nodes: No[], hub: Caixa }} Constelacao
 * @typedef {Caixa & { cwm: number, lines: string[] }} Assinatura
 *
 * @typedef {object} Layout
 * @property {number} fs fonte dos nomes
 * @property {number} cw largura do caractere nessa fonte
 * @property {number} lh altura de linha
 * @property {number} mem fator da fonte miúda (constelação e assinatura)
 * @property {number} W
 * @property {number} H
 * @property {Caixa[]} suns sol grande e, com constelação, o centro dela
 * @property {Caixa[]} fixed tudo que não se mexe
 * @property {Orbita[]} orbits
 * @property {Constelacao | null} cons
 * @property {boolean} hasCons
 * @property {Assinatura | null} sig
 */

/**
 * Texto mais largo entre os planetas e o reserva.
 * @param {OrbitaCfg[]} list
 * @param {string} fallback
 */
function widest(list, fallback) {
  let m = fallback || "";
  for (const o of list)
    for (const p of o.pl) if (p.t.length > m.length) m = p.t;
  return m;
}

/**
 * Algum planeta da órbita encosta em algo fixo em alguma volta?
 * @param {import('./geometria.js').Elipse} orb
 * @param {{ a: number, w: number, h: number }[]} pl
 * @param {Caixa[]} fixed
 */
function sunHit(orb, pl, fixed) {
  for (let a = 0; a < pl.length; a++)
    for (let g = 0; g < 360; g += 5) {
      const P = at(orb, pl[a].a + g);
      for (let i = 0; i < fixed.length; i++)
        if (
          ov(
            P.x,
            P.y,
            pl[a].w,
            pl[a].h,
            fixed[i].cx,
            fixed[i].cy,
            fixed[i].w,
            fixed[i].h,
          )
        )
          return true;
    }
  return false;
}

/**
 * Posiciona sol, órbitas, constelação e assinatura para uma fonte e uma escala.
 * @param {Cfg} cfg
 * @param {number} fs fonte dos nomes
 * @param {number} cw largura do caractere nessa fonte
 * @param {number} W
 * @param {number} H
 * @param {number} scale escala das órbitas grandes
 * @param {number} mscale escala do oval da constelação
 * @param {boolean} land arranjo de paisagem (constelação à direita do sistema)
 * @returns {Layout}
 */
export function layout(cfg, fs, cw, W, H, scale, mscale, land) {
  const lh = fs * 1.17;
  const mem = Math.max(0.72, 11 / fs);
  const cwm = cw * mem;
  const lhm = lh * mem;
  const cons = cfg.cons;
  const hasCons = !!(cons && cons.nodes.length);
  const bigOut = boxOf(widest(cfg.big, cfg.sunG), cw, lh, 1);
  /** @type {{ cx: number, cy: number, hw: number, hh: number, mR: number } | null} */
  let C = null;
  let big;
  if (cons && hasCons) {
    let widestNode = cons.sunM;
    for (const n of cons.nodes)
      if (n.t.length > widestNode.length) widestNode = n.t;
    const cOut = boxOf(widestNode, cwm, lhm, 1);
    const mR = land
      ? Math.min(
          (0.12 * W - cOut.w / 2) / 0.93,
          (0.2 * H - cOut.h / 2) / 0.72,
        ) * mscale
      : Math.min(Math.max(16 * cw, 0.14 * W) * mscale, 0.19 * W, 0.32 * H);
    const mh = halfBox(mR, mR * QM);
    C = {
      cx: W - mh.w - cOut.w / 2 - 8,
      cy: land ? Math.max(mh.h + lhm + 8, 0.25 * H) : mh.h + lhm + 12,
      hw: mh.w,
      hh: mh.h,
      mR,
    };
    big = land ? { cx: 0.373 * W, cy: 0.56 * H } : { cx: W / 2, cy: 0.6 * H };
  } else {
    big = { cx: W / 2, cy: H / 2 };
  }
  const bh1 = halfBox(1, QB);
  let rB;
  if (hasCons && land)
    rB = Math.min(
      (0.33 * W - bigOut.w / 2) / bh1.w,
      (0.42 * H - bigOut.h / 2) / bh1.h,
    );
  else
    rB = Math.min(
      (Math.min(big.cx, W - big.cx) - bigOut.w / 2 - 8) / bh1.w,
      (Math.min(big.cy, H - big.cy) - bigOut.h / 2 - 8) / bh1.h,
    );
  rB = Math.max(30, rB) * scale;
  /** @type {Caixa[]} */
  const suns = [
    {
      cx: big.cx,
      cy: big.cy,
      w: (cfg.sunG.length + 0.7) * cw * 1.3,
      h: lh * 1.3,
    },
  ];
  /** @type {Caixa[]} */
  const fixed = [suns[0]];
  /** @type {Constelacao | null} */
  let consOut = null;
  if (cons && C) {
    const centro = C;
    const hub = {
      cx: centro.cx,
      cy: centro.cy,
      w: (cons.sunM.length + 0.7) * cwm * 1.1,
      h: lhm * 1.1,
    };
    suns.push(hub);
    fixed.push(hub);
    const pos = NODE_POS[Math.min(cons.nodes.length, 4) - 1];
    /** @type {No[]} */
    const nodes = [];
    cons.nodes.slice(0, 4).forEach((n, k) => {
      const b = boxOf(n.t, cwm, lhm, 1);
      const node = {
        t: n.t,
        rotulo: n.rotulo,
        href: n.href,
        atual: n.atual,
        cx: centro.cx + pos[k][0] * Math.max(0, centro.hw - b.w / 2),
        cy: centro.cy + pos[k][1] * Math.max(0, centro.hh),
        w: b.w,
        h: b.h,
      };
      nodes.push(node);
      fixed.push(node);
    });
    consOut = {
      cx: centro.cx,
      cy: centro.cy,
      rx: centro.mR,
      ry: centro.mR * QM,
      nodes,
      hub,
    };
  }
  /** @type {Assinatura | null} */
  let sigBox = null;
  if (cfg.sig && cfg.sig.length) {
    let sw = 0;
    for (const l of cfg.sig) if (l.length > sw) sw = l.length;
    const w = (sw + 0.7) * cwm;
    const h = cfg.sig.length * lhm;
    sigBox = {
      w,
      h,
      cwm,
      lines: cfg.sig,
      cx: W - w / 2 - 12,
      cy: H - h / 2 - 10,
    };
    fixed.push(sigBox);
  }
  /** @type {Orbita[]} */
  const orbits = [];
  for (const o of cfg.big) {
    const pl = o.pl.map((p) => {
      const b = boxOf(p.t, cw, lh, 1);
      return {
        t: p.t,
        a: p.a,
        rotulo: p.rotulo,
        href: p.href,
        atual: p.atual,
        w: b.w,
        h: b.h,
      };
    });
    let rx = rB;
    if (o.inner) {
      for (let f = 0.5; f <= 0.8501; f += 0.05) {
        rx = f * rB;
        if (!sunHit({ cx: big.cx, cy: big.cy, rx, ry: rx * QB }, pl, fixed))
          break;
      }
    }
    orbits.push({
      off: 0,
      cx: big.cx,
      cy: big.cy,
      rx,
      ry: rx * QB,
      T: o.T,
      pl,
    });
  }
  return {
    fs,
    cw,
    lh,
    mem,
    W,
    H,
    suns,
    fixed,
    orbits,
    cons: consOut,
    hasCons,
    sig: sigBox,
  };
}

/**
 * Algo se sobrepõe sem depender da fase entre órbitas? Confere planeta contra borda,
 * contra o que é fixo e contra o vizinho de órbita em todas as voltas; fixo contra fixo;
 * linha de órbita contra a assinatura; e a órbita de fora contra o oval da constelação.
 * @param {Layout} L
 */
export function staticConflict(L) {
  let P, Q;
  for (const o1 of L.orbits) {
    for (let a = 0; a < o1.pl.length; a++) {
      const p = o1.pl[a];
      for (let g = 0; g < 360; g += 5) {
        P = at(o1, p.a + g);
        if (
          P.x - p.w / 2 < 2 ||
          P.x + p.w / 2 > L.W - 2 ||
          P.y - p.h / 2 < 2 ||
          P.y + p.h / 2 > L.H - 2
        )
          return true;
        for (const f of L.fixed)
          if (ov(P.x, P.y, p.w, p.h, f.cx, f.cy, f.w, f.h)) return true;
        for (let b = a + 1; b < o1.pl.length; b++) {
          const q = o1.pl[b];
          Q = at(o1, q.a + g);
          if (ov(P.x, P.y, p.w, p.h, Q.x, Q.y, q.w, q.h)) return true;
        }
      }
    }
  }
  for (let i = 0; i < L.fixed.length; i++) {
    const n = L.fixed[i];
    if (
      n.cx - n.w / 2 < 2 ||
      n.cx + n.w / 2 > L.W - 2 ||
      n.cy - n.h / 2 < 2 ||
      n.cy + n.h / 2 > L.H - 2
    )
      return true;
    for (let a = i + 1; a < L.fixed.length; a++) {
      const m = L.fixed[a];
      if (ov(n.cx, n.cy, n.w, n.h, m.cx, m.cy, m.w, m.h)) return true;
    }
  }
  if (L.sig) {
    const sig = L.sig;
    /** @type {import('./geometria.js').Elipse[]} */
    const lines = L.cons ? [...L.orbits, L.cons] : L.orbits;
    for (const linha of lines)
      for (let g = 0; g < 360; g += 2) {
        P = at(linha, g);
        if (
          Math.abs(P.x - sig.cx) < sig.w / 2 + 6 &&
          Math.abs(P.y - sig.cy) < sig.h / 2 + 6
        )
          return true;
      }
  }
  if (L.hasCons && L.cons) {
    const gOut = L.orbits[L.orbits.length - 1];
    const mOut = L.cons;
    const pad = 2 * L.cw;
    for (let g = 0; g < 360; g += 3) {
      P = at(gOut, g);
      Q = at(mOut, g);
      if (inside(mOut, P.x, P.y, pad) || inside(gOut, Q.x, Q.y, pad))
        return true;
    }
  }
  return false;
}

/**
 * Planetas de duas órbitas se cruzam em algum instante do período comum?
 * @param {Orbita} o1
 * @param {Orbita} o2
 */
export function pairConflict(o1, o2) {
  const per = (o1.T * o2.T) / gcd(o1.T, o2.T);
  for (const pa of o1.pl)
    for (const pb of o2.pl)
      for (let t = 0; t < per; t += 1) {
        const P = at(o1, pa.a + (360 * t) / o1.T);
        const Q = at(o2, pb.a + (360 * t) / o2.T);
        if (ov(P.x, P.y, pa.w, pa.h, Q.x, Q.y, pb.w, pb.h)) return true;
      }
  return false;
}

/**
 * Escolhe a fase de cada órbita (busca em profundidade com orçamento) para que nenhum
 * par cruze. Grava a fase em `off` de cada órbita.
 * @param {Layout} L
 */
export function pickPhases(L) {
  const n = L.orbits.length;
  let budget = 900;
  /** @param {number} i */
  function go(i) {
    if (i === n) return true;
    for (let c = 0; c < CAND.length; c++) {
      if (i === 0 && c > 0) break;
      L.orbits[i].off = CAND[c];
      let ok = true;
      for (let j = 0; j < i && ok; j++) {
        if (--budget < 0) return false;
        if (pairConflict(L.orbits[j], L.orbits[i])) ok = false;
      }
      if (ok && go(i + 1)) return true;
      if (budget < 0) return false;
    }
    return false;
  }
  return go(0);
}

/** @typedef {{ L: Layout, ok: boolean }} Encaixe */
/** @typedef {(fs: number) => number} LarguraDoCaractere */

/**
 * Maior fonte de nome (até a escolhida) e maior escala em que nada sobrepõe.
 * Desiste depois do orçamento de tempo e devolve `ok: false`.
 * @param {Cfg} cfg
 * @param {number} fs0 fonte escolhida
 * @param {number} W
 * @param {number} H
 * @param {LarguraDoCaractere} cwOf
 * @param {number} budget orçamento em milissegundos
 * @param {() => number} agora relógio em milissegundos
 * @returns {Encaixe}
 */
export function fitOnce(cfg, fs0, W, H, cwOf, budget, agora = Date.now) {
  const t0 = agora();
  const ms = [1.1, 1, 0.85];
  const modes = cfg.cons && W >= 1.3 * H ? [true, false] : [false];
  /**
   * @param {number} fs
   * @param {number} sc
   * @param {number} m
   * @param {boolean} land
   */
  function tryIt(fs, sc, m, land) {
    const L = layout(cfg, fs, cwOf(fs), W, H, sc, m, land);
    if (staticConflict(L) || !pickPhases(L)) return null;
    return { L, ok: true };
  }
  const desistir = () => ({
    L: layout(cfg, 10, cwOf(10), W, H, 0.45, 0.85, false),
    ok: false,
  });
  for (const land of modes) {
    const low = land ? 0.85 : 0.45;
    for (let sc = 1; sc >= low - 0.001; sc -= 0.05) {
      for (let fs = fs0; fs >= 12; fs--) {
        for (const m of ms) {
          if (agora() - t0 > budget) return desistir();
          const r = tryIt(fs, sc, m, land);
          if (r) return r;
        }
      }
    }
  }
  for (let f2 = 11; f2 >= 10; f2--) {
    for (const m of ms) {
      const r = tryIt(f2, 0.45, m, false);
      if (r) return r;
    }
  }
  return desistir();
}

/**
 * Encaixa o sistema. Sem arranjo com a constelação de ajustes, esconde-a (o idioma
 * segue no menu em texto) e tenta só o sistema grande.
 * @param {Cfg} cfg
 * @param {number} fs0
 * @param {number} W
 * @param {number} H
 * @param {LarguraDoCaractere} cwOf
 * @param {() => number} [agora] relógio em milissegundos (injetável nos testes)
 * @returns {Encaixe}
 */
export function fit(cfg, fs0, W, H, cwOf, agora = Date.now) {
  const r = fitOnce(cfg, fs0, W, H, cwOf, 1200, agora);
  if (!r.ok && cfg.cons) {
    const r2 = fitOnce({ ...cfg, cons: null }, fs0, W, H, cwOf, 600, agora);
    if (r2.ok) return r2;
  }
  return r;
}
