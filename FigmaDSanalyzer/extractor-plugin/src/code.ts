// Plugin para extrair chaves de componentes e estilos das bibliotecas do design system

const pluginInitialWidth = 520;
figma.showUI(__html__, { width: pluginInitialWidth, height: 480 }); // A altura inicial pode ser um padrão ou mínima

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

    case 'resize-plugin-window': // Novo tipo de mensagem vindo da UI
      if (msg.height && typeof msg.height === 'number' && msg.height > 0) {
        // Você pode querer adicionar validações para altura mínima/máxima aqui
        figma.ui.resize(pluginInitialWidth, msg.height);
      }
      break;
  }
};

async function extractDesignSystemData() {
  const componentsFile: {
    metadata: { extractedAt: string; fileName: string };
    components: Record<string, { key: string; isHidden?: boolean }>;
  } = {
    metadata: {
      extractedAt: new Date().toISOString(),
      fileName: figma.root.name
    },
    components: {}
  };

  const stylesFile: {
    metadata: { extractedAt: string; fileName: string };
    colorStyles: Record<string, string>;
    textStyles: Record<string, string>;
    effectStyles: Record<string, string>;
  } = {
    metadata: {
      extractedAt: new Date().toISOString(),
      fileName: figma.root.name
    },
    colorStyles: {},
    textStyles: {},
    effectStyles: {}
  };

  // Função para verificar se um componente é oculto
  const isHiddenComponent = (name: string): boolean =>
    name.startsWith('.') || name.startsWith('_');

  const componentEntries: Record<string, { key: string; isHidden?: boolean }> = {};

  // Encontra todos os componentes, incluindo os ocultos
  const components = figma.root.findAll(node =>
    node.type === 'COMPONENT' &&
    node.parent?.type !== 'COMPONENT_SET'
  );

  const componentSets = figma.root.findAll(node =>
    node.type === 'COMPONENT_SET'
  );

  // Função auxiliar para obter o nome da página de um node
  function getPageName(node: BaseNode): string {
    let parent = node.parent;
    while (parent && parent.type !== 'PAGE') {
      parent = parent.parent;
    }
    return parent && parent.type === 'PAGE' ? parent.name : 'UnknownPage';
  }

  // Adiciona componentes independentes
  for (const component of components) {
    const pageName = getPageName(component);
    const uniqueName = `${pageName}/${component.name}`;
    componentEntries[uniqueName] = {
      key: (component as ComponentNode).key,
      isHidden: isHiddenComponent(component.name)
    };
  }

  // Adiciona component sets
  for (const set of componentSets) {
    const pageName = getPageName(set);
    const uniqueName = `${pageName}/${set.name}`;
    componentEntries[uniqueName] = {
      key: (set as ComponentSetNode).key,
      isHidden: isHiddenComponent(set.name)
    };
  }

  componentsFile.components = componentEntries;

  // Extrai estilos
  for (const style of figma.getLocalPaintStyles()) {
    stylesFile.colorStyles[style.name] = `Key:${style.key}`;
  }

  for (const style of figma.getLocalTextStyles()) {
    const cleanId = style.id.replace(/,+$/, '');
    console.log(`TextStyle: ${style.name} => "${cleanId}"`);
    stylesFile.textStyles[style.name] = cleanId;
  }

  for (const style of figma.getLocalEffectStyles()) {
    const cleanId = style.id.trim().replace(/,+$/, '');
    console.log(`EffectStyle: ${style.name} => "${cleanId}"`);
    stylesFile.effectStyles[style.name] = cleanId;
  }

  const baseFileName = figma.root.name.trim().replace(/\s+/g, '-');

  figma.ui.postMessage({
    type: 'extraction-complete',
    componentsFile,
    stylesFile,
    fileNames: {
      components: `${baseFileName}.components.json`,
      styles: `${baseFileName}.styles.json`
    },
    summary: {
      components: Object.keys(componentsFile.components).length,
      colorStyles: Object.keys(stylesFile.colorStyles).length,
      textStyles: Object.keys(stylesFile.textStyles).length,
      effectStyles: Object.keys(stylesFile.effectStyles).length
    }
  });
}
