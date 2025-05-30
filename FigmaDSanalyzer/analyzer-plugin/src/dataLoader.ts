
import { ComponentData, StylesData } from './types';

// Importa dinamicamente todos os arquivos JSON da pasta data
async function loadDataFiles(): Promise<{
  components: ComponentData[];
  styles: StylesData[];
}> {
  const components: ComponentData[] = [];
  const styles: StylesData[] = [];

  // Lista de arquivos que serão importados dinamicamente
  // Isso será gerado pelo script de build
  try {
    // Importa arquivos de componentes (terminados com .components.json)
    const componentFiles = [
      '../data/Biblioteca-Part.1.components.json'
    ];
    
    for (const file of componentFiles) {
      try {
        const data = await import(file);
        components.push(data.default || data);
      } catch (error) {
        console.warn(`Erro ao carregar arquivo de componentes: ${file}`, error);
      }
    }

    // Importa arquivos de estilos (terminados com .styles.json)
    const styleFiles = [
      '../data/Design-Tokens.styles.json'
    ];
    
    for (const file of styleFiles) {
      try {
        const data = await import(file);
        styles.push(data.default || data);
      } catch (error) {
        console.warn(`Erro ao carregar arquivo de estilos: ${file}`, error);
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }

  return { components, styles };
}

export { loadDataFiles };
