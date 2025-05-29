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
  const componentsFile: {
    metadata: { extractedAt: string; fileName: string };
    components: Record<string, { key: string }>;
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

  const isVisibleComponent = (name: string): boolean =>
    !name.startsWith('.') && !name.startsWith('_');

  const componentEntries: Record<string, { key: string }> = {};

  const components = figma.root.findAll(node =>
    node.type === 'COMPONENT' &&
    node.parent?.type !== 'COMPONENT_SET' &&
    isVisibleComponent(node.name)
  );

  const componentSets = figma.root.findAll(node =>
    node.type === 'COMPONENT_SET' &&
    isVisibleComponent(node.name)
  );

  for (const component of components) {
    componentEntries[component.name] = {
      key: component.key
    };
  }

  for (const set of componentSets) {
    componentEntries[set.name] = {
      key: set.key
    };
  }

  componentsFile.components = componentEntries;

  for (const style of figma.getLocalPaintStyles()) {
    stylesFile.colorStyles[style.name] = `VariableID:${style.key}`;
  }

  for (const style of figma.getLocalTextStyles()) {
    stylesFile.textStyles[style.name] = `S:${style.id}`;
  }

  for (const style of figma.getLocalEffectStyles()) {
    stylesFile.effectStyles[style.name] = `S:${style.id}`;
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
