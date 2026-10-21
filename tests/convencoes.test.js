// Regras da casa conferidas por teste: cor só por token e nada de travessão no texto.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = new URL("..", import.meta.url).pathname;
/** @param {string} dir @param {RegExp} ext @returns {string[]} */
const arquivos = (dir, ext) =>
  readdirSync(join(raiz, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => ext.test(f))
    .map((f) => join(dir, f));

describe("cores", () => {
  it.each(arquivos("src/estilos", /\.css$/))(
    "%s: hex só em variável CSS",
    (f) => {
      const fora = readFileSync(join(raiz, f), "utf8")
        .split("\n")
        .filter(
          (l) => /#[0-9a-fA-F]{3,8}\b/.test(l) && !/^\s*--[\w-]+\s*:/.test(l),
        );
      expect(fora).toEqual([]);
    },
  );
});

// montado por código para este arquivo não conter o caractere
const TRAVESSAO = String.fromCharCode(0x2014);

describe("travessão", () => {
  const textos = [
    "index.html",
    "README.md",
    ...arquivos("src", /\.(js|css|svg)$/),
    ...arquivos("tests", /\.js$/),
  ];
  it.each(textos)("%s sem travessão", (f) => {
    expect(readFileSync(join(raiz, f), "utf8")).not.toContain(TRAVESSAO);
  });
});
