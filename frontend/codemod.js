const { Project, SyntaxKind } = require("ts-morph");
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const ruJsonPath = path.join(process.cwd(), 'messages', 'ru.json');
const ruJson = JSON.parse(fs.readFileSync(ruJsonPath, 'utf8'));

// Build reverse lookup for flat strings
const reverseLookup = {};
function traverse(obj, prefix = '') {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      if (!reverseLookup[v]) reverseLookup[v] = key;
    } else if (typeof v === 'object') {
      traverse(v, key);
    }
  }
}
traverse(ruJson);

function getKey(text) {
  const trimmed = text.trim();
  if (reverseLookup[trimmed]) return reverseLookup[trimmed];
  
  const hash = crypto.createHash('md5').update(trimmed).digest('hex').substring(0, 6);
  const key = `Auto.text_${hash}`;
  
  if (!ruJson.Auto) ruJson.Auto = {};
  ruJson.Auto[`text_${hash}`] = trimmed;
  reverseLookup[trimmed] = key;
  return key;
}

const project = new Project();
project.addSourceFilesAtPaths("src/app/**/*.tsx");
project.addSourceFilesAtPaths("src/components/**/*.tsx");
project.addSourceFilesAtPaths("src/app/**/*.ts");
project.addSourceFilesAtPaths("src/components/**/*.ts");

let modifiedFiles = 0;

for (const sourceFile of project.getSourceFiles()) {
  let hasChanges = false;
  let needsT = false;

  const jsxTexts = sourceFile.getDescendantsOfKind(SyntaxKind.JsxText);
  // Loop backwards to not mess up indices
  for (let i = jsxTexts.length - 1; i >= 0; i--) {
    const node = jsxTexts[i];
    const text = node.getText();
    if (/[А-Яа-яЁё]/.test(text)) {
      const trimmed = text.trim();
      if (!trimmed) continue;
      const key = getKey(trimmed);
      
      // We must preserve the whitespace around the trimmed text
      const before = text.substring(0, text.indexOf(trimmed));
      const after = text.substring(text.indexOf(trimmed) + trimmed.length);
      
      node.replaceWithText(`${before}{t('${key}')}${after}`);
      hasChanges = true;
      needsT = true;
    }
  }

  const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
  for (let i = stringLiterals.length - 1; i >= 0; i--) {
    const node = stringLiterals[i];
    const text = node.getLiteralValue();
    if (/[А-Яа-яЁё]/.test(text)) {
      const key = getKey(text);
      
      const parent = node.getParent();
      if (parent && parent.getKind() === SyntaxKind.JsxAttribute) {
        node.replaceWithText(`{t('${key}')}`);
      } else {
        node.replaceWithText(`t('${key}')`);
      }
      hasChanges = true;
      needsT = true;
    }
  }

  const noSubLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral);
  for (let i = noSubLiterals.length - 1; i >= 0; i--) {
    const node = noSubLiterals[i];
    const text = node.getLiteralValue();
    if (/[А-Яа-яЁё]/.test(text)) {
      const key = getKey(text);
      const parent = node.getParent();
      if (parent && parent.getKind() === SyntaxKind.JsxAttribute) {
          node.replaceWithText(`{t('${key}')}`);
      } else if (parent && parent.getKind() === SyntaxKind.JsxExpression) {
          node.replaceWithText(`t('${key}')`);
      } else {
          node.replaceWithText(`t('${key}')`);
      }
      hasChanges = true;
      needsT = true;
    }
  }

  if (needsT) {
    const imports = sourceFile.getImportDeclarations();
    const hasNextIntl = imports.some(i => i.getModuleSpecifierValue() === 'next-intl');
    if (!hasNextIntl) {
      sourceFile.insertImportDeclaration(0, {
        namedImports: ['useTranslations'],
        moduleSpecifier: 'next-intl'
      });
    }

    const functions = [
      ...sourceFile.getFunctions(),
      ...sourceFile.getVariableDeclarations().filter(v => v.getInitializer() && (v.getInitializer().getKind() === SyntaxKind.ArrowFunction || v.getInitializer().getKind() === SyntaxKind.FunctionExpression))
    ];

    for (const func of functions) {
      let body;
      if (func.getKind() === SyntaxKind.FunctionDeclaration) {
        body = func.getBody();
      } else {
         const init = func.getInitializer();
         if (init && init.getBody) body = init.getBody();
      }

      if (body && body.getKind() === SyntaxKind.Block) {
         const hasJSX = body.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 || 
                        body.getDescendantsOfKind(SyntaxKind.JsxFragment).length > 0 || 
                        body.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;
         if (hasJSX) {
            const hasT = body.getVariableStatements().some(vs => vs.getText().includes('useTranslations('));
            if (!hasT) {
               body.insertStatements(0, 'const t = useTranslations();');
            }
         }
      }
    }
  }

  if (hasChanges) {
    sourceFile.saveSync();
    modifiedFiles++;
    console.log(`Modified ${sourceFile.getFilePath()}`);
  }
}

fs.writeFileSync(ruJsonPath, JSON.stringify(ruJson, null, 2));
const dictionariesPath = path.join(process.cwd(), 'src', 'i18n', 'dictionaries', 'ru.json');
if (fs.existsSync(dictionariesPath)) {
  fs.writeFileSync(dictionariesPath, JSON.stringify(ruJson, null, 2));
}

console.log(`Finished processing. Modified ${modifiedFiles} files.`);
