import { AnalysisResult, ComponentData, StylesData } from './types';

// Set to track processed nodes and avoid duplicates
const processedNodes = new Set<string>();

function analyzeNodeColors(
  node: SceneNode, 
  stylesData: StylesData[]
): number {
  let nonCompliantColors = 0;
  console.log(`\nAnalisando cores do nó: ${node.name} (${node.id})`);

  // Check fillStyleId
  if ('fillStyleId' in node) {
    const fillStyleId = (node as any).fillStyleId;
    if (fillStyleId) {
      console.log(`  Fill Style:`, {
        nodeId: node.id,
        nodeName: node.name,
        styleId: fillStyleId,
        hasStyle: true
      });
      
      if (!isStyleInDesignSystem(fillStyleId, 'colorStyles', stylesData)) {
        nonCompliantColors++;
        console.log(`  ❌ Cor não conforme encontrada (fill):`, {
          nodeId: node.id,
          nodeName: node.name,
          reason: 'Estilo não encontrado no DS'
        });
      } else {
        console.log(`  ✅ Cor conforme (fill)`);
      }
    } else if (hasFills(node)) {
      // If node has fills but no style, count as non-compliant
      nonCompliantColors++;
      console.log(`  ❌ Cor não conforme encontrada (fill):`, {
        nodeId: node.id,
        nodeName: node.name,
        reason: 'Sem estilo vinculado'
      });
    }
  }

  // Check strokeStyleId
  if ('strokeStyleId' in node) {
    const strokeStyleId = (node as any).strokeStyleId;
    if (strokeStyleId) {
      console.log(`  Stroke Style:`, {
        nodeId: node.id,
        nodeName: node.name,
        styleId: strokeStyleId,
        hasStyle: true
      });
      
      if (!isStyleInDesignSystem(strokeStyleId, 'colorStyles', stylesData)) {
        nonCompliantColors++;
        console.log(`  ❌ Cor não conforme encontrada (stroke):`, {
          nodeId: node.id,
          nodeName: node.name,
          reason: 'Estilo não encontrado no DS'
        });
      } else {
        console.log(`  ✅ Cor conforme (stroke)`);
      }
    } else if (hasStrokes(node)) {
      // If node has strokes but no style, count as non-compliant
      nonCompliantColors++;
      console.log(`  ❌ Cor não conforme encontrada (stroke):`, {
        nodeId: node.id,
        nodeName: node.name,
        reason: 'Sem estilo vinculado'
      });
    }
  }

  return nonCompliantColors;
}

// Helper function to check if node has visible fills
function hasFills(node: SceneNode): boolean {
  if ('fills' in node) {
    const fills = (node as any).fills;
    if (Array.isArray(fills)) {
      return fills.some(fill => fill && fill.visible !== false);
    }
  }
  return false;
}

// Helper function to check if node has visible strokes
function hasStrokes(node: SceneNode): boolean {
  if ('strokes' in node) {
    const strokes = (node as any).strokes;
    if (Array.isArray(strokes)) {
      return strokes.some(stroke => stroke && stroke.visible !== false);
    }
  }
  return false;
}

function analyzeNodeFonts(node: SceneNode, stylesData: StylesData[]): number {
  let nonCompliantFonts = 0;
  
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    const textStyleId = textNode.textStyleId as string;
    if (!textStyleId || !isStyleInDesignSystem(textStyleId, 'textStyles', stylesData)) {
      nonCompliantFonts++;
    }
  }
  
  return nonCompliantFonts;
}

function analyzeNodeEffects(node: SceneNode, stylesData: StylesData[]): number {
  let nonCompliantEffects = 0;
  
  if ('effectStyleId' in node) {
    const effectStyleId = (node as any).effectStyleId;
    if (effectStyleId) {
      console.log(`  Effect Style:`, {
        nodeId: node.id,
        nodeName: node.name,
        styleId: effectStyleId,
        hasStyle: true
      });
      
      if (!isStyleInDesignSystem(effectStyleId, 'effectStyles', stylesData)) {
        nonCompliantEffects++;
        console.log(`  ❌ Efeito não conforme encontrado:`, {
          nodeId: node.id,
          nodeName: node.name,
          reason: 'Estilo não encontrado no DS'
        });
      } else {
        console.log(`  ✅ Efeito conforme`);
      }
    } else if (hasEffects(node)) {
      // If node has effects but no style, count as non-compliant
      nonCompliantEffects++;
      console.log(`  ❌ Efeito não conforme encontrado:`, {
        nodeId: node.id,
        nodeName: node.name,
        reason: 'Sem estilo vinculado'
      });
    }
  }
  
  return nonCompliantEffects;
}

// Helper function to check if node has visible effects
function hasEffects(node: SceneNode): boolean {
  if ('effects' in node) {
    const effects = (node as any).effects;
    if (Array.isArray(effects)) {
      return effects.some(effect => effect && effect.visible !== false);
    }
  }
  return false;
}

function isComponentFromDS(node: SceneNode, componentsData: ComponentData[]): boolean {
  if (node.type === 'INSTANCE') {
    const instance = node as InstanceNode;
    const mainComponent = instance.mainComponent;
    
    if (mainComponent) {
      return componentsData.some(data => 
        Object.values(data.components).some(comp => {
          const matchVariant = comp.key === mainComponent.key;
          const matchParent = mainComponent.parent?.type === 'COMPONENT_SET' && 
                            comp.key === (mainComponent.parent as ComponentSetNode).key;
          return matchVariant || matchParent;
        })
      );
    }
  }
  return false;
}

function analyzeSingleNode(
  node: SceneNode, 
  componentsData: ComponentData[], 
  stylesData: StylesData[],
  isTopLevel: boolean = true
): AnalysisResult {
  // Skip if node was already processed
  if (processedNodes.has(node.id)) {
    return {
      nonCompliantColors: 0,
      nonCompliantFonts: 0,
      nonCompliantEffects: 0,
      nonDsComponents: 0,
      totalLayers: 0,
      dsComponentsUsed: 0
    };
  }
  
  processedNodes.add(node.id);
  
  // Analyze styles
  const nonCompliantColors = analyzeNodeColors(node, stylesData);
  const nonCompliantFonts = analyzeNodeFonts(node, stylesData);
  const nonCompliantEffects = analyzeNodeEffects(node, stylesData);
  
  // Count this node as a layer if it's not a section, group, or vector
  const shouldCountAsLayer = !['SECTION', 'GROUP', 'VECTOR'].includes(node.type) && !isTopLevel;
  const totalLayers = shouldCountAsLayer ? 1 : 0;
  
  // Check if this node is a component instance
  let dsComponentsUsed = 0;
  let nonDsComponents = 0;
  
  if (node.type === 'INSTANCE') {
    if (isComponentFromDS(node, componentsData)) {
      dsComponentsUsed = 1;
    } else {
      nonDsComponents = 1;
      console.log(`  ❌ Componente não conforme encontrado:`, {
        nodeId: node.id,
        nodeName: node.name,
        reason: 'Componente não encontrado no DS'
      });
    }
  }

  return {
    nonCompliantColors,
    nonCompliantFonts,
    nonCompliantEffects,
    nonDsComponents,
    totalLayers,
    dsComponentsUsed
  };
}

export function analyzeNode(
  node: SceneNode, 
  componentsData: ComponentData[], 
  stylesData: StylesData[],
  skipComponentAnalysis: boolean = false,
  isTopLevel: boolean = true
): AnalysisResult {
  // Clear the processed nodes set at the start of a new analysis
  if (isTopLevel) {
    processedNodes.clear();
  }

  // Analyze current node
  const result = analyzeSingleNode(node, componentsData, stylesData, isTopLevel);
  
  // If this is a DS component instance, don't analyze its children
  if (result.dsComponentsUsed > 0) {
    return result;
  }
  
  // Recursively analyze children
  if ('children' in node && node.children) {
    for (const child of node.children) {
      const childResult = analyzeNode(child, componentsData, stylesData, skipComponentAnalysis, false);
      result.nonCompliantColors += childResult.nonCompliantColors;
      result.nonCompliantFonts += childResult.nonCompliantFonts;
      result.nonCompliantEffects += childResult.nonCompliantEffects;
      result.nonDsComponents += childResult.nonDsComponents;
      result.totalLayers += childResult.totalLayers;
      result.dsComponentsUsed += childResult.dsComponentsUsed;
    }
  }

  return result;
}

function isStyleInDesignSystem(
  styleId: string,
  styleType: 'colorStyles' | 'textStyles' | 'effectStyles',
  stylesData: StylesData[]
): boolean {
  if (!styleId) return false;
  
  const cleanStyleId = styleId.replace('S:', '').split(',')[0];
  
  return stylesData.some(data => {
    return Object.values(data[styleType] || {}).some(style => {
      const cleanDsStyleId = (style as string).replace(/^(Key:|S:)/, '');
      return cleanDsStyleId === cleanStyleId;
    });
  });
}
