/// <reference types="node" />
import { promises as fs } from 'fs';
import { join } from 'path';

declare const __dirname: string;

const dataDir = join(__dirname, '..', 'src', 'data');
const outputFile = join(__dirname, '..', 'src', 'dataImports.ts');

async function generateImports(): Promise<void> {
  try {
    const exists = await fs.access(dataDir).then(() => true).catch(() => false);
    
    if (!exists) {
    console.log('Data directory not found, creating empty imports');
      await fs.writeFile(outputFile, 'export const dataFiles: any[] = [];');
    return;
  }

    const files = (await fs.readdir(dataDir)).filter(file => file.endsWith('.json'));

  let imports = '';
  let exports = 'export const dataFiles = [\n';

  files.forEach((file, index) => {
    const varName = `data${index}`;
    const fileName = file.replace('.json', '');
    imports += `import * as ${varName} from './data/${file}';\n`;
    exports += `  { fileName: '${fileName}', data: ${varName} },\n`;
  });

  exports += '];';

  const content = imports + '\n' + exports;
    await fs.writeFile(outputFile, content);
  console.log(`Generated imports for ${files.length} data files`);
  } catch (error) {
    console.error('Error generating imports:', error);
    process.exit(1);
  }
}

generateImports();