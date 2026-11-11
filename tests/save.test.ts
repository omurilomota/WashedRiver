import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Save: localStorage, 3 slots e migração de formato.
 *
 * O módulo de save lê o `localStorage` no import. Por isso o stub é
 * instalado antes do import dinâmico, e os módulos são reiniciados entre
 * os testes — cada caso parte de um navegador limpo.
 */
class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get length(): number {
    return this.map.size;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
}

/**
 * Instala um localStorage vazio e devolve o módulo de save recém-carregado.
 *
 * O stub é instalado ANTES do reset: assim o módulo novo lê exatamente o
 * mesmo storage do módulo antigo (é assim que funciona no navegador).
 */
async function freshSave() {
  vi.stubGlobal('localStorage', new MemoryStorage());
  vi.resetModules();
  return import('../src/save/storage');
}

describe('save', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('começa com 3 slots e opções padrão', async () => {
    const { SaveDB, SAVE_VERSION } = await freshSave();
    expect(SaveDB.data.slots).toHaveLength(3);
    expect(SaveDB.data.v).toBe(SAVE_VERSION);
    expect(SaveDB.options.master).toBeGreaterThan(0);
    expect(SaveDB.slot.name).toBe('SLOT 1');
  });

  it('faz round-trip: o que foi salvo volta igual', async () => {
    const { SaveDB, KEY } = await freshSave();
    // Troca de slot ANTES de mexer no save: o `slot` getter aponta para
    // o slot ativo.
    SaveDB.setSlot(1);
    SaveDB.addScrap(123);
    SaveDB.unlockMap(2);
    SaveDB.setStars(0, 99, 3);
    SaveDB.achievement('pirata');
    SaveDB.save();

    const raw = localStorage.getItem(KEY);
    expect(raw).toBeTruthy();

    // Recarrega do zero: mesmo storage, módulo novo.
    vi.resetModules();
    const reloaded = await import('../src/save/storage');
    expect(reloaded.SaveDB.slotIndex).toBe(1);
    expect(reloaded.SaveDB.slot.oldScrap).toBe(123);
    expect(reloaded.SaveDB.slot.campaign).toBe(2);
    expect(reloaded.SaveDB.slot.stars[0]).toBe(3);
    expect(reloaded.SaveDB.hasAch('pirata')).toBe(true);
  });

  it('sobe a versão de um save antigo sem quebrar', async () => {
    const { KEY, SAVE_VERSION } = await freshSave();
    // Save v1: formato antigo, com buracos.
    localStorage.setItem(
      KEY,
      JSON.stringify({
        v: 1,
        active: 0,
        options: { master: 0.5 },
        slots: [{ name: 'SLOT 1', oldScrap: 77 }, null, undefined],
      }),
    );

    vi.resetModules();
    const { SaveDB } = await import('../src/save/storage');
    expect(SaveDB.data.v).toBe(SAVE_VERSION);
    expect(SaveDB.slot.oldScrap).toBe(77);
    // Campos que faltavam foram preenchidos.
    expect(SaveDB.slot.stars).toEqual({});
    expect(SaveDB.slot.daily).toEqual({ date: '', score: 0 });
    expect(SaveDB.slot.endlessBest).toEqual({ 0: 0, 1: 0, 2: 0 });
    // Opções que faltavam voltaram do padrão.
    expect(SaveDB.options.music).toBeGreaterThan(0);
  });

  it('save corrompido não derruba o jogo: começa limpo', async () => {
    const { KEY } = await freshSave();
    localStorage.setItem(KEY, '{isto não é json');

    vi.resetModules();
    const { SaveDB } = await import('../src/save/storage');
    expect(SaveDB.data.slots).toHaveLength(3);
    expect(SaveDB.slot.oldScrap).toBe(0);
  });

  it('save com número de slots errado é ignorado', async () => {
    const { KEY } = await freshSave();
    localStorage.setItem(KEY, JSON.stringify({ v: 3, active: 0, options: {}, slots: [{}] }));

    vi.resetModules();
    const { SaveDB } = await import('../src/save/storage');
    expect(SaveDB.data.slots).toHaveLength(3);
  });

  it('conquista só conta se existir na lista', async () => {
    const { SaveDB } = await freshSave();
    expect(SaveDB.achievement('pirata')).toBe(true);
    expect(SaveDB.achievement('pirata')).toBe(false); // já tinha
    expect(SaveDB.achievement('baleia_ok')).toBe(true);
    // Id solto não vira entrada invisível (quebraria a contagem da tela).
    expect(SaveDB.achievement('conquista_fantasma')).toBe(false);
    expect(Object.keys(SaveDB.slot.ach)).toHaveLength(2);
  });

  it('a árvore de desbloqueios cobra sucata e respeita pré-requisito', async () => {
    const { SaveDB } = await freshSave();
    const { TREE } = await import('../src/data');
    SaveDB.addScrap(10000);

    // Nó com pré-requisito: a compra só passa depois do pai.
    // Hoje nenhum nó do conteúdo usa `req`, então o teste injeta um
    // nó de mentira para cobrir a regra (e limpa depois).
    const pai = TREE.find((n) => !n.req);
    const falso = {
      id: '__teste_filho__',
      br: 'mare',
      nome: 'Nó de teste',
      desc: 'Só existe no teste.',
      cost: 10,
      max: 1,
      req: pai ? pai.id : undefined,
    };
    TREE.push(falso);
    try {
      expect(SaveDB.buyNode(falso.id)).toBe(false);
      expect(SaveDB.nodeLvl(falso.id)).toBe(0);
      expect(SaveDB.buyNode(pai!.id)).toBe(true);
      expect(SaveDB.buyNode(falso.id)).toBe(true);
    } finally {
      const i = TREE.findIndex((n) => n.id === falso.id);
      if (i >= 0) TREE.splice(i, 1);
    }

    // Compra um nó raiz funciona e desconta.
    expect(pai).toBeDefined();
    if (pai) {
      const before = SaveDB.slot.oldScrap;
      expect(SaveDB.buyNode(pai.id)).toBe(true);
      expect(SaveDB.slot.oldScrap).toBeLessThan(before);
      expect(SaveDB.nodeLvl(pai.id)).toBeGreaterThan(0);
    }
  });

  it('a compra da árvore para no nível máximo do nó', async () => {
    const { SaveDB } = await freshSave();
    const { TREE } = await import('../src/data');
    SaveDB.addScrap(100000);
    const node = TREE.find((n) => !n.req && n.max > 0);
    expect(node).toBeDefined();
    if (!node) return;

    for (let i = 0; i < node.max; i++) {
      expect(SaveDB.buyNode(node.id)).toBe(true);
    }
    expect(SaveDB.nodeLvl(node.id)).toBe(node.max);
    // Depois do máximo, não compra mais (e não gasta sucata).
    const before = SaveDB.slot.oldScrap;
    expect(SaveDB.buyNode(node.id)).toBe(false);
    expect(SaveDB.slot.oldScrap).toBe(before);
  });

  it('sem sucata não há compra', async () => {
    const { SaveDB } = await freshSave();
    const { TREE } = await import('../src/data');
    const node = TREE.find((n) => !n.req);
    expect(node).toBeDefined();
    if (!node) return;
    expect(SaveDB.buyNode(node.id)).toBe(false);
    expect(SaveDB.nodeLvl(node.id)).toBe(0);
  });
});
