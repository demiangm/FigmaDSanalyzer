import { AnalysisResult, ComponentData, StylesData } from './types';

// Set to track processed nodes and avoid duplicates
const processedNodes = new Set<string>();

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
  } catch (error) {
    console.error('Erro ao analisar cores:', error);
  }

  return nonCompliantColors;
}

// Helper function to check if node has visible fills
function hasFills(node: SceneNode): boolean {
  try {
    if ('fills' in node) {
      const fills = (node as any).fills;
      if (Array.isArray(fills)) {
        return fills.some(fill => fill && fill.visible !== false);
      }
    }
  } catch (error) {
    console.error('Erro ao verificar fills:', error);
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
        const styleIds = Object.values(textNode.textStyleId);
        for (const styleId of styleIds) {
          console.log(`  Text Style:`, {
            nodeId: node.id,
            nodeName: node.name,
            styleId: styleId,
            hasStyle: Boolean(styleId)
          });
          
          if (!styleId || !isStyleInDesignSystem(styleId, 'textStyles', stylesData)) {
            nonCompliantFonts++;
            console.log(`  ❌ Fonte não conforme encontrada:`, {
              nodeId: node.id,
              nodeName: node.name,
              reason: !styleId ? 'Sem estilo vinculado' : 'Estilo não encontrado no DS'
            });
          } else {
            console.log(`  ✅ Fonte conforme`);
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
          nonCompliantFonts++;
          console.log(`  ❌ Fonte não conforme encontrada:`, {
            nodeId: node.id,
            nodeName: node.name,
            reason: !textStyleId ? 'Sem estilo vinculado' : 'Estilo não encontrado no DS'
          });
        } else {
          console.log(`  ✅ Fonte conforme`);
        }
      }

      // Additional check for font families in the text content
      try {
        const fontNames = textNode.getRangeAllFontNames(0, textNode.characters.length);
        if (fontNames && fontNames.length > 0) {
          console.log(`  Fontes utilizadas:`, fontNames.map(font => font.family));
          
          // You might want to add a check here against allowed font families
          const allowedFonts = ['Livelo Sans VF', 'Inter']; // Add your allowed fonts here
          const nonCompliantFontFamilies = fontNames
            .map(font => font.family)
            .filter(fontFamily => !allowedFonts.includes(fontFamily));
          
          if (nonCompliantFontFamilies.length > 0) {
            console.log(`  ❌ Fontes não permitidas encontradas:`, nonCompliantFontFamilies);
            nonCompliantFonts += nonCompliantFontFamilies.length;
          }
        }
      } catch (error) {
        console.error('Erro ao verificar famílias de fonte:', error);
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

function isComponentFromDS(node: SceneNode, componentsData: ComponentData[]): { isFromDS: boolean; isHidden: boolean } {
  try {
    if (node.type === 'INSTANCE') {
      const instance = node as InstanceNode;
      const mainComponent = instance.mainComponent;
      
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

function analyzeSingleNode(
  node: SceneNode, 
  componentsData: ComponentData[], 
  stylesData: StylesData[],
  isTopLevel: boolean = true,
  isInsideDsComponent: boolean = false
): AnalysisResult {
  try {
    // Skip if node was already processed
    if (processedNodes.has(node.id)) {
      return {
        nonCompliantColors: 0,
        nonCompliantFonts: 0,
        nonCompliantEffects: 0,
        nonDsComponents: 0,
        totalLayers: 0,
        dsComponentsUsed: 0,
        hiddenComponentsUsed: 0
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
    let hiddenComponentsUsed = 0;
    
    if (node.type === 'INSTANCE') {
      const componentStatus = isComponentFromDS(node, componentsData);
      
      if (componentStatus.isFromDS) {
        if (componentStatus.isHidden) {
          hiddenComponentsUsed = 1;
          if (!isInsideDsComponent) {
            // Se for um componente oculto usado diretamente no frame (não dentro de um componente do DS),
            // contamos como não conforme
            nonDsComponents = 1;
            console.log(`  ❌ Componente oculto usado diretamente:`, {
              nodeId: node.id,
              nodeName: node.name,
              reason: 'Componente oculto deve ser usado apenas dentro de outros componentes'
            });
          } else {
            console.log(`  ℹ️ Componente oculto encontrado (dentro de componente DS):`, {
              nodeId: node.id,
              nodeName: node.name
            });
          }
        } else {
          dsComponentsUsed = 1;
          console.log(`  ✅ Componente do DS encontrado:`, {
            nodeId: node.id,
            nodeName: node.name
          });
        }
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
      dsComponentsUsed,
      hiddenComponentsUsed
    };
  } catch (error) {
    console.error('Erro ao analisar nó:', error);
    return {
      nonCompliantColors: 0,
      nonCompliantFonts: 0,
      nonCompliantEffects: 0,
      nonDsComponents: 0,
      totalLayers: 0,
      dsComponentsUsed: 0,
      hiddenComponentsUsed: 0
    };
  }
}

export function analyzeNode(
  node: SceneNode, 
  componentsData: ComponentData[], 
  stylesData: StylesData[],
  skipComponentAnalysis: boolean = false,
  isTopLevel: boolean = true,
  isInsideDsComponent: boolean = false
): AnalysisResult {
  try {
    // Clear the processed nodes set at the start of a new analysis
    if (isTopLevel) {
      processedNodes.clear();
    }

    // Analyze current node
    const result = analyzeSingleNode(node, componentsData, stylesData, isTopLevel, isInsideDsComponent);
    
    // If this is a DS component instance, mark that we're inside a DS component
    const isDsComponent = result.dsComponentsUsed > 0;
    
    // Recursively analyze children
    if ('children' in node && node.children) {
      for (const child of node.children) {
        try {
          const childResult = analyzeNode(
            child, 
            componentsData, 
            stylesData, 
            skipComponentAnalysis, 
            false,
            isInsideDsComponent || isDsComponent
          );

          // Always add style violations
          result.nonCompliantColors += childResult.nonCompliantColors;
          result.nonCompliantFonts += childResult.nonCompliantFonts;
          result.nonCompliantEffects += childResult.nonCompliantEffects;

          // Only add component and layer counts if not inside a DS component
          if (!isInsideDsComponent) {
            result.nonDsComponents += childResult.nonDsComponents;
            result.totalLayers += childResult.totalLayers;
            result.dsComponentsUsed += childResult.dsComponentsUsed;
            result.hiddenComponentsUsed += childResult.hiddenComponentsUsed;
          }
        } catch (error) {
          console.error('Erro ao analisar filho:', error);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Erro ao analisar nó:', error);
    return {
      nonCompliantColors: 0,
      nonCompliantFonts: 0,
      nonCompliantEffects: 0,
      nonDsComponents: 0,
      totalLayers: 0,
      dsComponentsUsed: 0,
      hiddenComponentsUsed: 0
    };
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
