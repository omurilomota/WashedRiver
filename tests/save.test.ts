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

  it('resetMapa apaga só o progresso daquele mapa (mandato 7)', async () => {
    const { SaveDB } = await freshSave();
    SaveDB.setSlot(0);
    SaveDB.addScrap(500);
    SaveDB.unlockMap(3);              // campanha no mapa 3
    SaveDB.setStars(1, 120, 3);
    SaveDB.setStars(2, 90, 2);
    SaveDB.achievement('baleia_ok');
    SaveDB.seenEnemy('baiacu');

    SaveDB.resetMapa(1);

    // o mapa pedido volta a zero
    expect(SaveDB.slot.stars[1]).toBeUndefined();
    expect(SaveDB.slot.best[1]).toBeUndefined();
    // campanha rebobina para o mapa apagado (joga de novo)
    expect(SaveDB.slot.campaign).toBe(1);
    // os outros mapas e a meta ficam
    expect(SaveDB.slot.stars[2]).toBe(2);
    expect(SaveDB.slot.oldScrap).toBe(500);
    expect(SaveDB.hasAch('baleia_ok')).toBe(true);
    expect(Object.keys(SaveDB.slot.seenB)).toContain('baiacu');

    // apagar um mapa que já foi passado também rebobina a campanha
    SaveDB.unlockMap(4);
    SaveDB.resetMapa(2);
    expect(SaveDB.slot.campaign).toBe(2);
    // apagar o mapa onde a campanha está não mexe nela
    SaveDB.resetMapa(2);
    expect(SaveDB.slot.campaign).toBe(2);
  });

  it('guarda o deck por mapa (BLOCO M.4)', async () => {
    const { SaveDB } = await freshSave();
    SaveDB.setSlot(0);
    SaveDB.unlockMap(2); // campanha no mapa 2
    SaveDB.setDeck(2, ['boia', 'torradeira', 'geladeira', 'bujao', 'holofote', 'ima', 'radio']);
    expect(SaveDB.getDeck(2)!.length).toBe(7);

    // deck de outro mapa é independente
    expect(SaveDB.getDeck(0)).toBeNull();
    SaveDB.setDeck(0, ['boia']);
    expect(SaveDB.getDeck(0)).toEqual(['boia']);
    expect(SaveDB.getDeck(2)!.length).toBe(7);

    // teto de 8: jogador não enfia a banca inteira
    SaveDB.setDeck(2, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']);
    expect(SaveDB.getDeck(2)!.length).toBe(8);

    // reset de mapa não apaga o deck (deck é escolha, não progresso)
    SaveDB.setDeck(1, ['boia', 'torradeira']);
    SaveDB.resetMapa(1);
    expect(SaveDB.getDeck(1)).toEqual(['boia', 'torradeira']);
  });

  it('bestiário abre por morte, não por visão (BLOCO M.5)', async () => {
    const { SaveDB } = await freshSave();
    SaveDB.setSlot(0);
    // viu o bicho: bestiário continua fechado
    SaveDB.seenEnemy('baiacu');
    expect(SaveDB.slot.mateiB['baiacu']).toBeUndefined();
    // matou: abre
    SaveDB.mateu('baiacu');
    expect(SaveDB.slot.mateiB['baiacu']).toBe(1);
    // e não repete
    SaveDB.mateu('baiacu');
    expect(SaveDB.slot.mateiB['baiacu']).toBe(1);
    // chefe derrotado tem registro próprio
    SaveDB.venci('bento');
    expect(SaveDB.slot.venciB['bento']).toBe(1);
    expect(SaveDB.slot.mateiB['bento']).toBeUndefined();
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

  it('letra padrão nova é 1.15 em save recém-criado', async () => {
    const { SaveDB } = await freshSave();
    expect(SaveDB.options.font).toBe(1.15);
  });

  it('save v3 mantém a escolha de letra do jogador (versão do save não muda)', async () => {
    const { KEY } = await freshSave();
    localStorage.setItem(
      KEY,
      JSON.stringify({ v: 3, active: 0, options: { font: 1.3 }, slots: [{}, {}, {}] }),
    );

    vi.resetModules();
    const { SaveDB } = await import('../src/save/storage');
    expect(SaveDB.data.v).toBe(3);
    expect(SaveDB.options.font).toBe(1.3);
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
