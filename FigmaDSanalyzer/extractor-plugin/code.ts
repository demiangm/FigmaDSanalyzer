// Plugin para extrair chaves de componentes e estilos das bibliotecas do design system

figma.showUI(__html__, { width: 360, height: 500 });

figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'extract-data':
      try {
        await extractDesignSystemData();
      } catch (error) {
        figma.ui.postMessage({
          type: 'extraction-error',
          message: error instanceof Error ? error.message : 'Erro ao extrair dados'
        });
      }
      break;
      
    case 'close':
      figma.closePlugin();
      break;
  }
};

async function extractDesignSystemData() {
  const componentsFile: any = {
    metadata: {
      extractedAt: new Date().toISOString(),
      fileName: figma.root.name
    },
    components: {}
  };

  const stylesFile: any = {
    metadata: {
      extractedAt: new Date().toISOString(),
      fileName: figma.root.name
    },
    colorStyles: {},
    textStyles: {},
    effectStyles: {}
  };

  // Extrair componentes principais
  const components = figma.root.findAll(node => node.type === 'COMPONENT') as ComponentNode[];
  for (const component of components) {
    componentsFile.components[component.name] = {
      key: component.key,
      id: component.id,
      description: component.description || '',
      type: component.type
    };
  }

  // Extrair estilos de cor
  const paintStyles = figma.getLocalPaintStyles();
  for (const style of paintStyles) {
    stylesFile.colorStyles[style.name] = {
      id: style.id,
      key: style.key,
      description: style.description || ''
    };
  }

  // Extrair estilos de texto
  const textStyles = figma.getLocalTextStyles();
  for (const style of textStyles) {
    stylesFile.textStyles[style.name] = {
      id: style.id,
      key: style.key,
      description: style.description || ''
    };
  }

  // Extrair estilos de efeito
  const effectStyles = figma.getLocalEffectStyles();
  for (const style of effectStyles) {
    stylesFile.effectStyles[style.name] = {
      id: style.id,
      key: style.key,
      description: style.description || ''
    };
  }

  figma.ui.postMessage({
    type: 'extraction-complete',
    componentsFile,
    stylesFile,
    summary: {
      components: Object.keys(componentsFile.components).length,
      colorStyles: Object.keys(stylesFile.colorStyles).length,
      textStyles: Object.keys(stylesFile.textStyles).length,
      effectStyles: Object.keys(stylesFile.effectStyles).length
    }
  });
}