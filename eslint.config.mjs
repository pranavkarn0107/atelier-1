import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

const baseConfig = firebaseRulesPlugin.configs['flat/recommended'];
const configs = Array.isArray(baseConfig) ? baseConfig : [baseConfig];

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*'],
  },
  ...configs.map((cfg) => ({
    ...cfg,
    files: ['**/firestore.rules', '**/DRAFT_firestore.rules'],
  })),
];
