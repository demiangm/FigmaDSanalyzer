import { AnalysisResult, ComplianceReport, ComponentData, StylesData } from './types';

// Set to track processed nodes and avoid duplicates
const processedNodes = new Set<string>();

// List of node types to exclude from layer counting
const EXCLUDED_NODE_TYPES = [
  'SECTION',
  'GROUP',
  'VECTOR',
  'ELLIPSE',
  'LINE',
  'COMPONENT',  // Main component definition
  'COMPONENT_SET'  // Component variants container
];

// List of frame names to ignore in layer counting
const IGNORED_FRAME_NAMES = [
  'Grid',
  'Overlay'
];

// Lista de prefixos de nomes a ignorar
const IGNORED_NAME_PREFIXES = [
  'Native/',
  'iOS/',
  'Android/',
  'Assets.'
];

// Palavras-chave para ignorar análise de estilos em componentes do DS
const IGNORE_STYLE_KEYWORDS = [
  'ignore-ds-styles',
  'ilustração',
  // Adicione outras palavras-chave aqui
];

function hasIgnoredPrefix(name: string): boolean {
  return IGNORED_NAME_PREFIXES.some(prefix => name.startsWith(prefix));
}

function analyzeNodeColors(
  node: SceneNode, 
  stylesData: StylesData[]
): number {
  let nonCompliantColors = 0;
  
  try {
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
      } else if (hasNonImageFills(node)) {
        // If node has non-image fills but no style, count as non-compliant
        nonCompliantColors++;
        console.log(`  ❌ Cor não conforme encontrada (fill):`, {
          nodeId: node.id,
          nodeName: node.name,
          reason: 'Sem estilo vinculado (e não é imagem)'
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
  } catch (error) {
    console.error('Erro ao analisar cores:', error);
  }

  return nonCompliantColors;
  }

// Helper function to check if node has visible non-image fills
function hasNonImageFills(node: SceneNode): boolean {
  try {
    if ('fills' in node) {
      const fills = (node as any).fills;
      if (Array.isArray(fills)) {
        return fills.some(fill => fill && fill.visible !== false && fill.type !== 'IMAGE');
      }
    }
  } catch (error) {
    console.error('Erro ao verificar fills não-imagem:', error);
  }
  return false;
}

// Helper function to check if node has visible strokes
function hasStrokes(node: SceneNode): boolean {
  try {
    if ('strokes' in node) {
      const strokes = (node as any).strokes;
      if (Array.isArray(strokes)) {
        return strokes.some(stroke => stroke && stroke.visible !== false);
      }
    }
  } catch (error) {
    console.error('Erro ao verificar strokes:', error);
  }
  return false;
}

function analyzeNodeFonts(node: SceneNode, stylesData: StylesData[]): number {
  let nonCompliantFonts = 0;
  
  try {
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      console.log(`\nAnalisando fontes do nó: ${node.name} (${node.id})`);
      
      // Handle rich text with multiple segments
      if (textNode.textStyleId && typeof textNode.textStyleId !== 'string') {
        // For rich text, check each segment's style
        const styleIds = Object.values(textNode.textStyleId).filter((id): id is string => typeof id === 'string');
        let hasNonCompliantSegment = false;
        
        // Se não há nenhum styleId válido, é não conforme
        if (styleIds.length === 0) {
          nonCompliantFonts = 1;
          console.log(`  ❌ Texto com múltiplos estilos não conforme:`, {
            nodeId: node.id,
            nodeName: node.name,
            reason: 'Nenhum estilo de texto aplicado'
          });
        } else {
          for (const styleId of styleIds) {
            console.log(`  Text Style:`, {
              nodeId: node.id,
              nodeName: node.name,
              styleId: styleId,
              hasStyle: Boolean(styleId)
            });
            
            if (!styleId || !isStyleInDesignSystem(styleId, 'textStyles', stylesData)) {
              hasNonCompliantSegment = true;
              console.log(`  ❌ Segmento não conforme encontrado:`, {
                nodeId: node.id,
                nodeName: node.name,
                reason: !styleId ? 'Sem estilo vinculado' : 'Estilo não encontrado no DS'
              });
            } else {
              console.log(`  ✅ Segmento conforme`);
            }
          }
          
          // Se qualquer segmento não for conforme, conta como 1 fonte não conforme
          if (hasNonCompliantSegment) {
            nonCompliantFonts = 1;
            console.log(`  ❌ Texto com múltiplos estilos não conforme:`, {
              nodeId: node.id,
              nodeName: node.name,
              reason: 'Pelo menos um segmento não usa estilo do DS'
            });
          }
        }
      } else {
        // Single style for the entire text
        const textStyleId = textNode.textStyleId as string;
        console.log(`  Text Style:`, {
          nodeId: node.id,
          nodeName: node.name,
          styleId: textStyleId,
          hasStyle: Boolean(textStyleId)
        });
        
        if (!textStyleId || !isStyleInDesignSystem(textStyleId, 'textStyles', stylesData)) {
          nonCompliantFonts = 1;
          console.log(`  ❌ Fonte não conforme encontrada:`, {
            nodeId: node.id,
            nodeName: node.name,
            reason: !textStyleId ? 'Sem estilo vinculado' : 'Estilo não encontrado no DS'
          });
        } else {
          console.log(`  ✅ Fonte conforme`);
        }
      }
    }
  } catch (error) {
    console.error('Erro ao analisar fontes:', error);
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

// Torna isComponentFromDS assíncrona e usa getMainComponentAsync
async function isComponentFromDSAsync(node: SceneNode, componentsData: ComponentData[]): Promise<{ isFromDS: boolean; isHidden: boolean }> {
  try {
    if (node.type === 'INSTANCE') {
      const instance = node as InstanceNode;
      const mainComponent = await instance.getMainComponentAsync();
      if (mainComponent) {
        let foundComponent: { isFromDS: boolean; isHidden: boolean } = { isFromDS: false, isHidden: false };
        componentsData.some(data =>
          Object.entries(data.components || {}).some(([name, comp]) => {
            try {
              const matchVariant = comp.key === mainComponent.key;
              const matchParent = mainComponent.parent?.type === 'COMPONENT_SET' &&
                comp.key === (mainComponent.parent as ComponentSetNode).key;
              if (matchVariant || matchParent) {
                foundComponent = {
                  isFromDS: true,
                  isHidden: comp.isHidden || false
                };
                return true;
              }
              return false;
            } catch (error) {
              console.error('Erro ao verificar componente:', error);
              return false;
            }
          })
        );
        return foundComponent;
      }
    }
  } catch (error) {
    console.error('Erro ao verificar componente do DS:', error);
  }
  return { isFromDS: false, isHidden: false };
}

// Helper function to check if a node has any styles applied
function hasAppliedStyles(node: SceneNode): boolean {
  // Check if node has fills
  if ('fills' in node) {
    const fills = (node as any).fills;
    if (Array.isArray(fills) && fills.some(fill => fill && fill.visible !== false)) {
      return true;
    }
  }

  // Check if node has strokes
  if ('strokes' in node) {
    const strokes = (node as any).strokes;
    if (Array.isArray(strokes) && strokes.some(stroke => stroke && stroke.visible !== false)) {
      return true;
    }
  }

  // Check if node has effects
  if ('effects' in node) {
    const effects = (node as any).effects;
    if (Array.isArray(effects) && effects.some(effect => effect && effect.visible !== false)) {
      return true;
    }
  }

  // Check for style IDs
  if ('fillStyleId' in node && (node as any).fillStyleId) return true;
  if ('strokeStyleId' in node && (node as any).strokeStyleId) return true;
  if ('effectStyleId' in node && (node as any).effectStyleId) return true;

  return false;
}

function shouldIgnoreStylesByDescription(description?: string): boolean {
  if (!description) return false;
  return IGNORE_STYLE_KEYWORDS.some(keyword => description.toLowerCase().includes(keyword.toLowerCase()));
}

// Versão assíncrona de analyzeSingleNode
async function analyzeSingleNodeAsync(
  node: SceneNode, 
  componentsData: ComponentData[],
  stylesData: StylesData[], 
  isTopLevel: boolean = true,
  isInsideDsComponent: boolean = false
): Promise<AnalysisResult & { shouldSkipChildren?: boolean }> {
  try {
    if (processedNodes.has(node.id)) {
      return {
        nonCompliantColors: 0,
        nonCompliantFonts: 0,
        nonCompliantEffects: 0,
        nonDsComponents: 0,
        totalLayers: 0,
        dsComponentsUsed: 0,
        hiddenComponentsUsed: 0,
        shouldSkipChildren: false
      };
    }
    processedNodes.add(node.id);
    let nonCompliantColors = 0;
    let nonCompliantFonts = 0;
    let nonCompliantEffects = 0;
    let nonDsComponents = 0;
    let totalLayers = 0;
    let dsComponentsUsed = 0;
    let hiddenComponentsUsed = 0;
    if (node.type === 'INSTANCE') {
      const instance = node as InstanceNode;
      const mainComponent = await instance.getMainComponentAsync();
      const isExternalLibrary = mainComponent && mainComponent.remote === true;
      const componentStatus = await isComponentFromDSAsync(node, componentsData);
      // Nova regra: ignorar estilos se descrição do componente do DS contiver palavra-chave
      if (componentStatus.isFromDS && mainComponent && shouldIgnoreStylesByDescription(mainComponent.description)) {
        return {
          nonCompliantColors: 0,
          nonCompliantFonts: 0,
          nonCompliantEffects: 0,
          nonDsComponents: 0,
          totalLayers: 1,
          dsComponentsUsed: 1,
          hiddenComponentsUsed: 0,
          shouldSkipChildren: true
        };
      }
      if (isExternalLibrary && hasIgnoredPrefix(node.name)) {
        return {
          nonCompliantColors: 0,
          nonCompliantFonts: 0,
          nonCompliantEffects: 0,
          nonDsComponents: 0,
          totalLayers: 1,
          dsComponentsUsed: 0,
          hiddenComponentsUsed: 0,
          shouldSkipChildren: true
        };
      }
      // Lógica de análise para instâncias
      const isLocalComponent = mainComponent && mainComponent.remote === false && !componentStatus.isFromDS;
      if (componentStatus.isFromDS) {
        if (componentStatus.isHidden) {
          hiddenComponentsUsed = 1;
          if (!isInsideDsComponent) {
            nonDsComponents = 1;
            totalLayers = 1;
          }
        } else if (!isInsideDsComponent) {
          dsComponentsUsed = 1;
          totalLayers = 1;
        }
      } else if (isLocalComponent) {
        if (!IGNORED_FRAME_NAMES.includes(node.name) && !isTopLevel && hasAppliedStyles(node)) {
          totalLayers = 1;
        }
      } else {
        nonDsComponents = 1;
        if (!IGNORED_FRAME_NAMES.includes(node.name) && !isTopLevel) {
          totalLayers = 1;
        }
      }
      // Análise de estilos
      nonCompliantColors = analyzeNodeColors(node, stylesData);
      nonCompliantFonts = analyzeNodeFonts(node, stylesData);
      nonCompliantEffects = analyzeNodeEffects(node, stylesData);
    } else {
      const shouldCountAsLayer = !EXCLUDED_NODE_TYPES.includes(node.type) &&
        !isTopLevel &&
        !IGNORED_FRAME_NAMES.includes(node.name) &&
        !isInsideDsComponent &&
        (node.type !== 'FRAME' || hasAppliedStyles(node));
      if (shouldCountAsLayer) {
        totalLayers = 1;
        if (node.type === 'TEXT') {
          const textNode = node as TextNode;
          let isCompliant = false;
          if (textNode.textStyleId && typeof textNode.textStyleId === 'string') {
            isCompliant = isStyleInDesignSystem(textNode.textStyleId, 'textStyles', stylesData);
          } else if (textNode.textStyleId && typeof textNode.textStyleId === 'object') {
            const styleIds = Object.values(textNode.textStyleId).filter((id): id is string => typeof id === 'string');
            isCompliant = styleIds.length > 0 && styleIds.every(styleId => styleId && isStyleInDesignSystem(styleId, 'textStyles', stylesData));
          }
          if (isCompliant) {
            dsComponentsUsed = 1;
          }
        }
      }
      // Análise de estilos
      nonCompliantColors = analyzeNodeColors(node, stylesData);
      nonCompliantFonts = analyzeNodeFonts(node, stylesData);
      nonCompliantEffects = analyzeNodeEffects(node, stylesData);
    }
    return {
      nonCompliantColors,
      nonCompliantFonts,
      nonCompliantEffects,
      nonDsComponents,
      totalLayers,
      dsComponentsUsed,
      hiddenComponentsUsed,
      shouldSkipChildren: false
    };
  } catch (error) {
    // Envia erro para a UI se disponível
    if (typeof figma !== 'undefined' && figma.ui) {
      figma.ui.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
    console.error('Erro ao analisar nó (async):', error);
    return {
      nonCompliantColors: 0,
      nonCompliantFonts: 0,
      nonCompliantEffects: 0,
      nonDsComponents: 0,
      totalLayers: 0,
      dsComponentsUsed: 0,
      hiddenComponentsUsed: 0,
      shouldSkipChildren: false
    };
  }
}

// Versão assíncrona recursiva de analyzeNode
export async function analyzeNodeAsync(
  node: SceneNode,
  componentsData: ComponentData[],
  stylesData: StylesData[],
  skipComponentAnalysis: boolean = false,
  isTopLevel: boolean = true,
  isInsideDsComponent: boolean = false
): Promise<AnalysisResult> {
  try {
    if (isTopLevel) {
      processedNodes.clear();
    }
    const result = await analyzeSingleNodeAsync(node, componentsData, stylesData, isTopLevel, isInsideDsComponent);
    if (result.shouldSkipChildren) {
      return result;
    }
    const isDsComponent = result.dsComponentsUsed > 0;
    if ('children' in node && node.children) {
      for (const child of node.children) {
        try {
          const childResult = await analyzeNodeAsync(
            child,
            componentsData,
            stylesData,
            skipComponentAnalysis,
            false,
            isInsideDsComponent || isDsComponent
          );
          result.nonCompliantColors += childResult.nonCompliantColors;
          result.nonCompliantFonts += childResult.nonCompliantFonts;
          result.nonCompliantEffects += childResult.nonCompliantEffects;
          result.nonDsComponents += childResult.nonDsComponents;
          if (!isDsComponent) {
            result.totalLayers += childResult.totalLayers;
            result.dsComponentsUsed += childResult.dsComponentsUsed;
          }
          result.hiddenComponentsUsed += childResult.hiddenComponentsUsed;
        } catch (error) {
          if (typeof figma !== 'undefined' && figma.ui) {
            figma.ui.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
          }
          console.error('Erro ao analisar nó filho (async):', error);
        }
      }
    }
    return result;
  } catch (error) {
    if (typeof figma !== 'undefined' && figma.ui) {
      figma.ui.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
    console.error('Erro ao analisar nó (async):', error);
    throw error;
  }
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

// Versão assíncrona de analyzeFrame
export async function analyzeFrame(
  frame: FrameNode,
  componentsData: ComponentData[],
  stylesData: StylesData[]
): Promise<ComplianceReport> {
  try {
    const analysis = await analyzeNodeAsync(frame, componentsData, stylesData, false, true);
    const validLayers = analysis.totalLayers;
    const coveragePercentage = (validLayers + analysis.nonCompliantColors + analysis.nonCompliantFonts + analysis.nonCompliantEffects) > 0
      ? (analysis.dsComponentsUsed / (validLayers + analysis.nonCompliantColors + analysis.nonCompliantFonts + analysis.nonCompliantEffects)) * 100
      : 0;
    let coverageLevel: { emoji: string; label: string };
    if (coveragePercentage < 50) {
      coverageLevel = { emoji: "🚧", label: "Muito baixa" };
    } else if (coveragePercentage < 70) {
      coverageLevel = { emoji: "🚩️", label: "Baixa" };
    } else if (coveragePercentage < 90) {
      coverageLevel = { emoji: "✅", label: "Boa" };
    } else {
      coverageLevel = { emoji: "🎉", label: "Ótima" };
    }
    return {
      frameName: frame.name,
      frameId: frame.id,
      totalLayers: validLayers,
      dsComponentsUsed: analysis.dsComponentsUsed,
      hiddenComponentsUsed: analysis.hiddenComponentsUsed,
      coveragePercentage: Math.round(coveragePercentage),
      coverageLevel,
      nonCompliantItems: {
        colors: analysis.nonCompliantColors,
        fonts: analysis.nonCompliantFonts,
        effects: analysis.nonCompliantEffects,
        components: analysis.nonDsComponents
      }
    };
  } catch (error) {
    if (typeof figma !== 'undefined' && figma.ui) {
      figma.ui.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
    throw error;
  }
}

// Helper function to count nodes that should be excluded from the layer count
function countExcludedNodes(node: SceneNode): number {
  let count = 0;
  
  // Check if current node should be excluded
  if (node.type === 'SECTION' || node.type === 'GROUP' || node.type === 'VECTOR') {
    count++;
  }
  
  // Recursively check children
  if ('children' in node) {
    for (const child of node.children) {
      count += countExcludedNodes(child);
    }
  }
  
  return count;
}
