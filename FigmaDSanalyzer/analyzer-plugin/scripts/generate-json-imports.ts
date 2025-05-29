import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
const outputFile = path.resolve(__dirname, '../src/data/index.ts');

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

const imports = files.map(f => {
  const name = f.replace('.json', '');
  return `import ${name} from '../../data/${f}';`;
});

const exportBlock = `export default {\n  ${files.map(f => f.replace('.json', '')).join(',\n  ')}\n};`;

const content = imports.join('\n') + '\n\n' + exportBlock + '\n';

fs.writeFileSync(outputFile, content);

console.log('✅ data/index.ts gerado com sucesso.');
