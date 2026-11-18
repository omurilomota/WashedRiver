// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { MACH, MACH_ORDER } from '../src/data';
import { COLW, LANE_H } from '../src/core/constants';

/**
 * O corpo das engenhocas.
 *
 * Pega o defeito que a auditoria achou: a "sombra de ventre" era pintada
 * ANTES do desenho da peça e desaparecia atrás dela, e o rim light era um
 * arco fixo em `(0,-24)` que não acompanhava geladeira nem espelho. Aqui o
 * acabamento é dimensionado pelo corpo (tabela `CORPO_MAQUINA`) e pintado
 * DEPOIS do desenho — e o teste confere que ele existe.
 */

/** O objeto que o jogo usa como contexto 2D (criado na importação). */
const alvo: Record<string, unknown> = { canvas: { width: 1280, height: 846 } };
const especiais: Record<string, unknown> = {};

let ops: string[] = [];
const grad = { addColorStop: (c: string) => void ops.push(`gradiente(${c})`) };

function instalarEspeciais(): void {
  especiais.createLinearGradient = (...a: number[]) => {
    ops.push(`linear(${a.join()})`);
    return grad;
  };
  especiais.createRadialGradient = (...a: number[]) => {
    ops.push(`radial(${a.join()})`);
    return grad;
  };
  especiais.measureText = (t: string) => ({ width: t.length * 6 });
}

const ctx = new Proxy(alvo, {
  get: (target, prop: string) => {
    if (prop in target) return target[prop];
    if (prop in especiais) return especiais[prop];
    return (...args: unknown[]) => {
      ops.push(`${prop}(${args.map((a) => String(a)).join()})`);
      return undefined;
    };
  },
  set: (target, prop, value) => {
    (target as Record<string, unknown>)[String(prop)] = value;
    return true;
  },
});

let desenho: typeof import('../src/render/sprites');

beforeAll(async () => {
  document.body.innerHTML = '<canvas id="cv"></canvas>';
  HTMLCanvasElement.prototype.getContext = (() =>
    ctx) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  instalarEspeciais();
  desenho = await import('../src/render/sprites');
});

/** Assinatura do desenho de uma máquina. */
function assinaMaquina(tipo: string, icon: boolean): string {
  ops = [];
  desenho.drawMachine({
    type: tipo,
    x: 300,
    lane: 2,
    hp: 1,
    maxhp: 1,
    anim: 0,
    act: 0,
    flash: 0,
    ...(icon ? { _icon: true } : {}),
  });
  return ops.join('|');
}

/** As engenhocas de verdade: `remover` é ferramenta, não peça. */
const MAQUINAS = MACH_ORDER.filter((k) => MACH[k] && k !== 'remover');

describe('o corpo das máquinas é dado, não chute', () => {
  it('toda engenhoca tem corpo, e ele cabe na lane', () => {
    for (const k of MAQUINAS) {
      const corpo = desenho.corpoMaquina(k);
      expect(corpo.w, `${k} sem largura`).toBeGreaterThan(0);
      expect(corpo.h, `${k} sem altura`).toBeGreaterThan(0);
      expect(corpo.base, `${k} sem base`).toBeGreaterThan(0);
      expect(corpo.w, `${k} é mais larga que a coluna`).toBeLessThanOrEqual(COLW);
      expect(corpo.h, `${k} é mais alta que a lane`).toBeLessThanOrEqual(LANE_H);
    }
  });

  it('toda engenhoca do baralho tem corpo declarado', () => {
    for (const k of MAQUINAS) {
      expect(desenho.corpoMaquina(k).w, `${k} caiu no corpo padrão`).toBeGreaterThan(0);
    }
  });

  it('peça desconhecida cai no corpo padrão (não quebra)', () => {
    const padrao = desenho.corpoMaquina('engenhoca_que_nao_existe');
    expect(padrao.w).toBeGreaterThan(0);
    expect(padrao.h).toBeGreaterThan(0);
  });
});

describe('o acabamento de corpo acontece', () => {
  it('toda engenhoca desenha no campo sem estourar', () => {
    for (const k of MAQUINAS) {
      const assinatura = assinaMaquina(k, false);
      expect(assinatura.length, `${k} não desenhou nada no campo`).toBeGreaterThan(40);
    }
  });

  it('toda engenhoca desenha como ícone de carta sem estourar', () => {
    for (const k of MAQUINAS) {
      const assinatura = assinaMaquina(k, true);
      expect(assinatura.length, `${k} não desenhou nada no ícone`).toBeGreaterThan(20);
    }
  });

  it('no campo, toda peça recebe gradientes de volume e elipses de corpo', () => {
    // oclusão + brilho = 2 gradientes radiais; contato + oclusão + brilho +
    // rim light = 4 elipses. Se alguém voltar a pintar a sombra antes do
    // corpo ou remover o acabamento, este teste fica vermelho.
    for (const k of MAQUINAS) {
      const opsDaVez = assinaMaquina(k, false).split('|');
      const gradientes = opsDaVez.filter((o) => o.startsWith('radial(')).length;
      const elipses = opsDaVez.filter((o) => o.startsWith('ellipse(')).length;
      expect(gradientes, `${k} sem gradiente de volume`).toBeGreaterThanOrEqual(2);
      expect(elipses, `${k} sem elipses de corpo`).toBeGreaterThanOrEqual(2);
    }
  });

  it('no ícone, o acabamento de campo fica de fora', () => {
    for (const k of MAQUINAS) {
      const opsDaVez = assinaMaquina(k, true).split('|');
      const gradientes = opsDaVez.filter((o) => o.startsWith('radial(')).length;
      expect(gradientes, `${k} levou acabamento de campo pro ícone`).toBe(0);
    }
  });
});
