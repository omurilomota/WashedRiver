/**
 * Conventional Commits + gitmoji.
 * O tipo é obrigatório e em inglês; o escopo é o módulo do jogo.
 * O corpo explica o PORQUÊ — o "o quê" fica no header.
 *
 * O gitmoji vem ANTES do tipo (✨ feat(lanes): ...). O commitlint não
 * entende isso por padrão, então o headerPattern abaixo aceita o emoji
 * opcional como prefixo e o ignora na hora de validar tipo/escopo/assunto.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  // O gitmoji vem ANTES do tipo (✨ feat(lanes): ...). O commitlint não
  // entende isso por padrão, então o headerPattern abaixo aceita o emoji
  // opcional como prefixo e o ignora na hora de validar tipo/escopo/assunto.
  parserPreset: {
    parserOpts: {
      headerPattern: /^(?:\p{Extended_Pictographic}️?\s*)?(\w+)(?:\(([^()]+)\))?!?:\s(.+)$/u,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
  ignores: [(message) => /^Merge (branch|pull request|remote)/i.test(message)],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'refactor',
        'perf',
        'style',
        'docs',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'lanes',
        'sprites',
        'creatures',
        'content',
        'game',
        'ui',
        'audio',
        'save',
        'balance',
        'enemies',
        'src',
        'build',
        'deps',
        'repo',
        'release',
        'github',
        'docs',
        'ci',
        'readme',
        'contributing',
      ],
    ],
    'subject-case': [0],
    'subject-full-stop': [2, 'never'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
  },
};
