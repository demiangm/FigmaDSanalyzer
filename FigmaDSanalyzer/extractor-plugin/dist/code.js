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
  const componentsFile = {
    metadata: {
      extractedAt: new Date().toISOString(),
      fileName: figma.root.name
    },
    components: {}
  };

  const stylesFile = {
    metadata: {
      extractedAt: new Date().toISOString(),
      fileName: figma.root.name
    },
    colorStyles: {},
    textStyles: {},
    effectStyles: {}
  };

  const isVisibleComponent = (name) => !name.startsWith('.') && !name.startsWith('_');

  const componentEntries = {};

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

  const paintStyles = figma.getLocalPaintStyles();
  for (const style of paintStyles) {
    stylesFile.colorStyles[style.name] = {
      id: style.id,
      key: style.key,
      description: style.description || ''
    };
  }

  const textStyles = figma.getLocalTextStyles();
  for (const style of textStyles) {
    stylesFile.textStyles[style.name] = {
      id: style.id,
      key: style.key,
      description: style.description || ''
    };
  }

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
