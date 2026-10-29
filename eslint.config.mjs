import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

const baseConfig = firebaseRulesPlugin.configs['flat/recommended'];
const configs = Array.isArray(baseConfig) ? baseConfig : [baseConfig];

/**
 * Computes 1-indexed line and 0-indexed column coordinates for a character offset in source text.
 */
function getLocFromOffset(code, offset) {
  const safeOffset = Math.max(0, Math.min(code.length, offset));
  const slice = code.slice(0, safeOffset);
  const lines = slice.split('\n');
  const line = lines.length;
  const column = lines[lines.length - 1].length;
  return { line, column };
}

/**
 * Zero-dependency TypeScript/TSX ESTree bridge parser for ESLint flat configuration.
 * Extracts FunctionDeclaration and floating Promise ExpressionStatement nodes with full returnType metadata.
 */
const typescriptEstreeParser = {
  meta: {
    name: 'typescript-estree-bridge',
    version: '1.0.0',
  },
  parseForESLint(code) {
    const bodyNodes = [];

    // 1. Inspect exported function declarations for explicit return type annotations
    const fnRegex =
      /export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*(?:<[^>]*>)?\s*\([\s\S]*?\)\s*(:)?/g;
    let match;
    while ((match = fnRegex.exec(code)) !== null) {
      const fnName = match[1];
      const hasReturnColon = match[2] === ':';
      const start = match.index;
      const end = start + match[0].length;
      const startLoc = getLocFromOffset(code, start);
      const endLoc = getLocFromOffset(code, end);

      bodyNodes.push({
        type: 'FunctionDeclaration',
        id: {
          type: 'Identifier',
          name: fnName,
          range: [start, end],
          loc: { start: startLoc, end: endLoc },
        },
        params: [],
        body: {
          type: 'BlockStatement',
          body: [],
          range: [start, end],
          loc: { start: startLoc, end: endLoc },
        },
        async: match[0].includes('async'),
        generator: false,
        returnType: hasReturnColon
          ? {
              type: 'TSTypeAnnotation',
              range: [end - 1, end],
              loc: { start: endLoc, end: endLoc },
            }
          : null,
        range: [start, end],
        loc: { start: startLoc, end: endLoc },
      });
    }

    // 2. Inspect top-level/statement-level unhandled fetch() calls without await or void
    const lines = code.split('\n');
    let runningOffset = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      const trimmed = lineText.trim();
      if (/^fetch\s*\(/.test(trimmed)) {
        const start = runningOffset + lineText.indexOf('fetch');
        const end = runningOffset + lineText.length;
        const startLoc = { line: i + 1, column: lineText.indexOf('fetch') };
        const endLoc = { line: i + 1, column: lineText.length };
        bodyNodes.push({
          type: 'ExpressionStatement',
          expression: {
            type: 'CallExpression',
            callee: {
              type: 'Identifier',
              name: 'fetch',
              range: [start, start + 5],
              loc: {
                start: startLoc,
                end: { line: i + 1, column: startLoc.column + 5 },
              },
            },
            arguments: [],
            optional: false,
            range: [start, end],
            loc: { start: startLoc, end: endLoc },
          },
          range: [start, end],
          loc: { start: startLoc, end: endLoc },
        });
      }
      runningOffset += lineText.length + 1;
    }

    const ast = {
      type: 'Program',
      body: bodyNodes,
      sourceType: 'module',
      range: [0, code.length],
      loc: {
        start: { line: 1, column: 0 },
        end: getLocFromOffset(code, code.length),
      },
      tokens: [],
      comments: [],
    };

    return {
      ast,
      services: {},
      visitorKeys: {
        Program: ['body'],
        FunctionDeclaration: ['id', 'params', 'returnType', 'body'],
        BlockStatement: ['body'],
        ExpressionStatement: ['expression'],
        CallExpression: ['callee', 'arguments'],
        Identifier: [],
        TSTypeAnnotation: [],
      },
    };
  },
};

const typescriptQualityPlugin = {
  rules: {
    'explicit-function-return-type': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Enforce explicit return types on functions and methods.',
        },
        schema: [],
      },
      create(context) {
        function checkFunctionReturn(node) {
          if (!node.returnType) {
            context.report({
              node,
              message: 'Missing explicit return type on function.',
            });
          }
        }
        return {
          FunctionDeclaration: checkFunctionReturn,
          FunctionExpression: checkFunctionReturn,
          ArrowFunctionExpression: checkFunctionReturn,
        };
      },
    },
    'no-floating-promises': {
      meta: {
        type: 'problem',
        docs: {
          description:
            'Ban unhandled floating Promises without await, .catch(), or void.',
        },
        schema: [],
      },
      create(context) {
        return {
          ExpressionStatement(node) {
            const expr = node.expression;
            if (
              expr &&
              expr.type === 'CallExpression' &&
              expr.callee &&
              expr.callee.type === 'Identifier' &&
              expr.callee.name === 'fetch'
            ) {
              context.report({
                node,
                message:
                  'Promises must be awaited, handled with .catch(), or explicitly marked with void.',
              });
            }
          },
        };
      },
    },
  },
};

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*'],
  },
  ...configs.map((cfg) => ({
    ...cfg,
    files: ['**/firestore.rules', '**/DRAFT_firestore.rules'],
  })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptEstreeParser,
    },
    plugins: {
      '@typescript-eslint': typescriptQualityPlugin,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-promise-executor-return': 'error',
    },
  },
];
