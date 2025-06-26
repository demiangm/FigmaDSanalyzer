import { AnalysisResult, ComplianceReport, ComponentData, StylesData, Violation } from './types';

// Set to track processed nodes and avoid duplicates
const processedNodes = new Set<string>();

// List of node types to exclude from layer counting
const EXCLUDED_NODE_TYPES = [
  'SECTION',
  'GROUP',
  'VECTOR',
  'ELLIPSE',
  'TEXT',
  'COMPONENT',  // Main component definition
  'COMPONENT_SET'  // Component variants container
];

// List of frame names to ignore in layer counting
const IGNORED_FRAME_NAMES = [
  'Grid',
  'Overlay'
];

// Função utilitária para converter RGB (0-255) em hexadecimal
function rgbToHex(r: number, g: number, b: number): string {
  const componentToHex = (c: number) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function analyzeNodeColors(
  node: SceneNode,
  stylesData: StylesData[],
  violations: Violation[]
): number {
  let nonCompliantColors = 0;
  try {
    // FILL
    if ('fillStyleId' in node) {
      const fillStyleId = (node as any).fillStyleId;
      if (fillStyleId) {
        if (!isStyleInDesignSystem(fillStyleId, 'colorStyles', stylesData)) {
          let hex = '';
          if ('fills' in node && Array.isArray((node as any).fills) && (node as any).fills.length > 0) {
            // Pega o primeiro fill visível e do tipo SOLID
            const fill = (node as any).fills.find(f => f && f.visible !== false && f.type === 'SOLID');
            if (fill && fill.color) {
              hex = rgbToHex(fill.color.r * 255, fill.color.g * 255, fill.color.b * 255);
            }
          }
          if (!hex) hex = '(sem cor)';
          nonCompliantColors++;
          violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: 'Cor (fill) não conforme',
            currentValue: hex,
            expectedValue: 'Estilo do DS'
          });
        }
      } else if (hasFills(node)) {
        let hex = '';
        if ('fills' in node && Array.isArray((node as any).fills) && (node as any).fills.length > 0) {
          const fill = (node as any).fills.find(f => f && f.visible !== false && f.type === 'SOLID');
          if (fill && fill.color) {
            hex = rgbToHex(fill.color.r * 255, fill.color.g * 255, fill.color.b * 255);
          }
        }
        if (!hex) hex = '(sem cor)';
        nonCompliantColors++;
        violations.push({
          nodeId: node.id,
          nodeName: node.name,
          issue: 'Cor (fill) sem estilo vinculado',
          currentValue: hex,
          expectedValue: 'Estilo do DS'
        });
      }
    }
    // STROKE
    if ('strokeStyleId' in node) {
      const strokeStyleId = (node as any).strokeStyleId;
      if (strokeStyleId) {
        if (!isStyleInDesignSystem(strokeStyleId, 'colorStyles', stylesData)) {
          let hex = '';
          if ('strokes' in node && Array.isArray((node as any).strokes) && (node as any).strokes.length > 0) {
            const stroke = (node as any).strokes.find(s => s && s.visible !== false && s.type === 'SOLID');
            if (stroke && stroke.color) {
              hex = rgbToHex(stroke.color.r * 255, stroke.color.g * 255, stroke.color.b * 255);
            }
          }
          if (!hex) hex = '(sem cor)';
          nonCompliantColors++;
          violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: 'Cor (stroke) não conforme',
            currentValue: hex,
            expectedValue: 'Estilo do DS'
          });
        }
      } else if (hasStrokes(node)) {
        let hex = '';
        if ('strokes' in node && Array.isArray((node as any).strokes) && (node as any).strokes.length > 0) {
          const stroke = (node as any).strokes.find(s => s && s.visible !== false && s.type === 'SOLID');
          if (stroke && stroke.color) {
            hex = rgbToHex(stroke.color.r * 255, stroke.color.g * 255, stroke.color.b * 255);
          }
        }
        if (!hex) hex = '(sem cor)';
        nonCompliantColors++;
        violations.push({
          nodeId: node.id,
          nodeName: node.name,
          issue: 'Cor (stroke) sem estilo vinculado',
          currentValue: hex,
          expectedValue: 'Estilo do DS'
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

function analyzeNodeFonts(node: SceneNode, stylesData: StylesData[], violations: Violation[]): number {
  let nonCompliantFonts = 0;
  
  try {
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      console.log(`\nAnalisando fontes do nó: ${node.name} (${node.id})`);
      // Helper para montar string do valor
      function getFontValue(font: FontName, size: number) {
        return `${size} - ${font.family} - ${font.style}`;
      }
      // Handle rich text com múltiplos segmentos
      if (textNode.textStyleId && typeof textNode.textStyleId !== 'string') {
        const styleIds = Object.values(textNode.textStyleId);
        for (const styleId of styleIds) {
          if (!styleId || !isStyleInDesignSystem(styleId, 'textStyles', stylesData)) {
            nonCompliantFonts++;
            let fontValue = '';
            try {
              const font = textNode.getRangeFontName(0, textNode.characters.length) as FontName;
              fontValue = getFontValue(font, textNode.fontSize as number);
            } catch {}
            console.log(`  Text Style:`, {
              nodeId: node.id,
              nodeName: node.name,
              styleId: styleId,
              hasStyle: Boolean(styleId)
            });
            
            console.log(`  ❌ Fonte não conforme encontrada:`, {
              nodeId: node.id,
              nodeName: node.name,
              reason: !styleId ? 'Sem estilo vinculado' : 'Estilo não encontrado no DS',
              currentValue: fontValue
            });
            violations.push({
              nodeId: node.id,
              nodeName: node.name,
              issue: 'Fonte não conforme',
              currentValue: fontValue,
              expectedValue: 'Estilo do DS'
            });
          } else {
            console.log(`  ✅ Fonte conforme`);
          }
        }
      } else {
        // Single style para todo o texto
        const textStyleId = textNode.textStyleId as string;
        if (!textStyleId || !isStyleInDesignSystem(textStyleId, 'textStyles', stylesData)) {
          nonCompliantFonts++;
          let fontValue = '';
          try {
            const font = textNode.fontName as FontName;
            fontValue = getFontValue(font, textNode.fontSize as number);
          } catch {}
          console.log(`  Text Style:`, {
            nodeId: node.id,
            nodeName: node.name,
            styleId: textStyleId,
            hasStyle: Boolean(textStyleId)
          });
          
          console.log(`  ❌ Fonte não conforme encontrada:`, {
            nodeId: node.id,
            nodeName: node.name,
            reason: !textStyleId ? 'Sem estilo vinculado' : 'Estilo não encontrado no DS',
            currentValue: fontValue
          });
          violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: 'Fonte não conforme',
            currentValue: fontValue,
            expectedValue: 'Estilo do DS'
          });
        } else {
          console.log(`  ✅ Fonte conforme`);
        }
      }
      // Checagem adicional de famílias de fonte
      try {
        const fontNames = textNode.getRangeAllFontNames(0, textNode.characters.length);
        if (fontNames && fontNames.length > 0) {
          const allowedFonts = ['Livelo Sans VF', 'Inter'];
          const nonCompliantFontFamilies = fontNames
            .map(font => font.family)
            .filter(fontFamily => !allowedFonts.includes(fontFamily));
          if (nonCompliantFontFamilies.length > 0) {
            nonCompliantFonts += nonCompliantFontFamilies.length;
            console.log(`  ❌ Fontes não permitidas encontradas:`, nonCompliantFontFamilies);
            violations.push({
              nodeId: node.id,
              nodeName: node.name,
              issue: 'Fonte não permitida',
              currentValue: nonCompliantFontFamilies.join(', '),
              expectedValue: allowedFonts.join(', ')
            });
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

function analyzeNodeBorderRadius(node: SceneNode, violations: Violation[]): number {
  let nonCompliantBorderRadius = 0;
  // Defina aqui os valores permitidos pelo DS
  const allowedBorderRadius = [0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 56, 64];
  try {
    if ('cornerRadius' in node && typeof (node as any).cornerRadius === 'number') {
      const radius = (node as any).cornerRadius;
      if (!allowedBorderRadius.includes(radius)) {
        nonCompliantBorderRadius++;
        violations.push({
          nodeId: node.id,
          nodeName: node.name,
          issue: 'Raio de borda não conforme',
          currentValue: radius.toString(),
          expectedValue: allowedBorderRadius.join(', ')
        });
      }
    }
    // Suporte para cornerRadius como array (cantos independentes)
    if ('cornerRadius' in node && Array.isArray((node as any).cornerRadius)) {
      const radii = (node as any).cornerRadius;
      radii.forEach((radius: number, idx: number) => {
        if (!allowedBorderRadius.includes(radius)) {
          nonCompliantBorderRadius++;
          violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: `Raio de borda não conforme (canto ${idx + 1})`,
            currentValue: radius.toString(),
            expectedValue: allowedBorderRadius.join(', ')
          });
        }
      });
    }
  } catch (error) {
    console.error('Erro ao analisar border radius:', error);
  }
  return nonCompliantBorderRadius;
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
        nonCompliantBorderRadius: 0,
        nonDsComponents: 0,
        totalLayers: 0,
        dsComponentsUsed: 0,
        hiddenComponentsUsed: 0
      };
    }
    
    processedNodes.add(node.id);
    
    console.log(`\n📍 Analisando nó: ${node.name} (${node.type})`, {
      nodeId: node.id,
      isTopLevel,
      isInsideDsComponent
    });
        
    // Analyze styles (always check styles regardless of being inside a DS component)
    const violations: Violation[] = [];
    const nonCompliantColors = analyzeNodeColors(node, stylesData, violations);
    const nonCompliantFonts = analyzeNodeFonts(node, stylesData, violations);
    const nonCompliantEffects = analyzeNodeEffects(node, stylesData);
    const nonCompliantBorderRadius = analyzeNodeBorderRadius(node, violations);
    
    let totalLayers = 0;
    let dsComponentsUsed = 0;
    let nonDsComponents = 0;
    let hiddenComponentsUsed = 0;
    
    // Check if this node is a component instance
    if (node.type === 'INSTANCE') {
      const componentStatus = isComponentFromDS(node, componentsData);
      
      if (componentStatus.isFromDS) {
        if (componentStatus.isHidden) {
          hiddenComponentsUsed = 1;
          if (!isInsideDsComponent) {
            nonDsComponents = 1;
            totalLayers = 1; // Count hidden components as layers when used directly
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
        } else if (!isInsideDsComponent) {
          dsComponentsUsed = 1;
          totalLayers = 1; // Count DS components as one layer
          console.log(`  ✅ Componente do DS encontrado:`, {
            nodeId: node.id,
            nodeName: node.name,
            totalLayers,
            dsComponentsUsed
          });
        } else {
          console.log(`  ℹ️ Componente DS aninhado encontrado (não contabilizado):`, {
            nodeId: node.id,
            nodeName: node.name
          });
        }
      } else {
        nonDsComponents = 1;
        // Count non-DS instances as regular layers
        if (!IGNORED_FRAME_NAMES.includes(node.name) && !isTopLevel) {
          totalLayers = 1;
          console.log(`  ❌ Componente não conforme contabilizado como layer:`, {
            nodeId: node.id,
            nodeName: node.name,
            totalLayers
          });
        }
      }
    } else {
      // For non-instance nodes, count as layer if not excluded
      const shouldCountAsLayer = !EXCLUDED_NODE_TYPES.includes(node.type) && 
                               !isTopLevel && 
                               !IGNORED_FRAME_NAMES.includes(node.name) &&
                               !isInsideDsComponent && // Don't count layers inside DS components
                               // Only count FRAME if it has styles applied
                               (node.type !== 'FRAME' || hasAppliedStyles(node));
      
      if (shouldCountAsLayer) {
        totalLayers = 1;
        console.log(`  ➕ Layer contabilizada:`, {
          nodeId: node.id,
          nodeName: node.name,
          type: node.type,
          totalLayers,
          hasStyles: node.type === 'FRAME' ? hasAppliedStyles(node) : 'N/A'
        });
      } else {
        console.log(`  ➖ Layer não contabilizada:`, {
          nodeId: node.id,
          nodeName: node.name,
          type: node.type,
          reason: EXCLUDED_NODE_TYPES.includes(node.type) ? 'Tipo excluído' :
                 isTopLevel ? 'Nó de topo' :
                 IGNORED_FRAME_NAMES.includes(node.name) ? 'Nome ignorado' :
                 node.type === 'FRAME' && !hasAppliedStyles(node) ? 'Frame sem estilos' :
                 isInsideDsComponent ? 'Dentro de componente DS' :
                 'Outro'
        });
      }
    }

    return {
      nonCompliantColors,
      nonCompliantFonts,
      nonCompliantEffects,
      nonCompliantBorderRadius,
      nonDsComponents,
      totalLayers,
      dsComponentsUsed,
      hiddenComponentsUsed,
      violations
    };
  } catch (error) {
    console.error('Erro ao analisar nó:', error);
    return {
      nonCompliantColors: 0,
      nonCompliantFonts: 0,
      nonCompliantEffects: 0,
      nonCompliantBorderRadius: 0,
      nonDsComponents: 0,
      totalLayers: 0,
      dsComponentsUsed: 0,
      hiddenComponentsUsed: 0,
      violations: []
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
    
    // Recursively analyze children - always analyze children to count all DS components
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

          // Add results from children
          result.nonCompliantColors += childResult.nonCompliantColors;
          result.nonCompliantFonts += childResult.nonCompliantFonts;
          result.nonCompliantEffects += childResult.nonCompliantEffects;
          result.nonCompliantBorderRadius += childResult.nonCompliantBorderRadius;
          result.nonDsComponents += childResult.nonDsComponents;
          
          // If this is not a DS component, add child layers and components
          if (!isDsComponent) {
            result.totalLayers += childResult.totalLayers;
            result.dsComponentsUsed += childResult.dsComponentsUsed;
          }
          result.hiddenComponentsUsed += childResult.hiddenComponentsUsed;
          result.violations.push(...childResult.violations!);
        } catch (error) {
          console.error('Erro ao analisar nó filho:', error);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Erro ao analisar nó:', error);
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

export async function analyzeFrame(
  frame: FrameNode,
  componentsData: ComponentData[],
  stylesData: StylesData[]
): Promise<ComplianceReport> {
  // Analyze the frame and all its children
  const analysis = analyzeNode(frame, componentsData, stylesData, false, true);

  // Calculate coverage percentage - penalize by non-compliant styles
  const validLayers = analysis.totalLayers;
  const coveragePercentage = (validLayers + analysis.nonCompliantColors + analysis.nonCompliantFonts + analysis.nonCompliantEffects + analysis.nonCompliantBorderRadius) > 0
    ? (analysis.dsComponentsUsed / (validLayers + analysis.nonCompliantColors + analysis.nonCompliantFonts + analysis.nonCompliantEffects + analysis.nonCompliantBorderRadius)) * 100
    : 0;

  // Determine coverage level based on new thresholds
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

  console.log('[DEBUG] Cálculo de cobertura:', {
    validLayers,
    dsComponentsUsed: analysis.dsComponentsUsed,
    nonCompliantColors: analysis.nonCompliantColors,
    nonCompliantFonts: analysis.nonCompliantFonts,
    nonCompliantEffects: analysis.nonCompliantEffects,
    nonCompliantBorderRadius: analysis.nonCompliantBorderRadius,
    coveragePercentage
  });

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
      borderRadius: analysis.nonCompliantBorderRadius,
      components: analysis.nonDsComponents
    },
    violations: analysis.violations!
  };
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
