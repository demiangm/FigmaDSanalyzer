import * as fs from 'fs';
import * as path from 'path';

// Declare __dirname if necessary
declare var __dirname: string;
const dataDir = path.join(__dirname, '..', 'src', 'data');
const outputFile = path.join(__dirname, '..', 'src', 'dataImports.ts');

function generateImports() {
  if (!fs.existsSync(dataDir)) {
    console.log('Data directory not found, creating empty imports');
    fs.writeFileSync(outputFile, 'export const dataFiles: any[] = [];');
    return;
  }

  const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

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
  fs.writeFileSync(outputFile, content);
  console.log(`Generated imports for ${files.length} data files`);
}

generateImports();