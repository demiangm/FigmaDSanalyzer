import { ComponentData, StylesData } from './types';

// Importa todos os arquivos JSON da pasta data
const jsonContext = require.context('./data', false, /\.json$/);

// Importa dinamicamente todos os arquivos JSON da pasta data
async function loadDataFiles(): Promise<{
  components: ComponentData[];
  styles: StylesData[];
}> {
  try {
  const components: ComponentData[] = [];
  const styles: StylesData[] = [];

    // Processa cada arquivo JSON
    jsonContext.keys().forEach((key: string) => {
      try {
        const file = jsonContext(key);
        
        if (file && typeof file === 'object') {
          // Verifica se é um arquivo de componentes
          if (file.components && file.metadata) {
            components.push(file as ComponentData);
            console.log('Arquivo de componentes carregado:', file.metadata.fileName);
          }
          // Verifica se é um arquivo de estilos
          else if (file.colorStyles && file.textStyles && file.effectStyles && file.metadata) {
            styles.push(file as StylesData);
            console.log('Arquivo de estilos carregado:', file.metadata.fileName);
          } else {
            console.warn('Arquivo JSON não reconhecido:', file.metadata?.fileName || key);
          }
        }
      } catch (error) {
        console.error('Erro ao processar arquivo:', key, error);
      }
    });

    // Valida se temos pelo menos um arquivo de cada tipo
    if (components.length === 0) {
      throw new Error('Nenhum arquivo de componentes válido encontrado na pasta data/');
    }

    if (styles.length === 0) {
      throw new Error('Nenhum arquivo de estilos válido encontrado na pasta data/');
    }

    console.log(`Carregados ${components.length} arquivos de componentes e ${styles.length} arquivos de estilos`);

    return { components, styles };
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    throw error;
  }
}

export { loadDataFiles };

