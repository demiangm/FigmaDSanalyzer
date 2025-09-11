import { AnalysisResult, ComplianceReport, ComponentData, StylesData, StyleIssue, NonCompliantDetails } from './types';
import { getStyleName, hasNonImageFills, hasStrokes, createEmptyDetails, isStyleInDesignSystem } from './utils';

// Cache para componentes DS já verificados
const dsComponentCache = new Map<string, { isFromDS: boolean; isHidden: boolean }>();

// Cache para estilos já verificados
const styleCache = new Map<string, boolean>();

// Limite de profundidade para evitar recursão excessiva
const MAX_DEPTH = 10;

// Constants
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
  'Brand'
  // Adicione outras palavras-chave aqui
];

// Componentes que podem ter estilos alterados quando usados diretamente
const DIRECT_USE_ALLOWED_COMPONENTS = [
  'Icon',
  'Ícone',
  'icon'
];

function hasIgnoredPrefix(name: string): boolean {
  return IGNORED_NAME_PREFIXES.some(prefix => name.startsWith(prefix));
}

async function analyzeNodeColors(
  node: SceneNode, 
  stylesData: StylesData[],
  componentsData: ComponentData[]
): Promise<{ count: number; issues: StyleIssue[] }> {
  let nonCompliantColors = 0;
  const issues: StyleIssue[] = [];
  
  try {
    // Check fillStyleId
    if ('fillStyleId' in node) {
      const fillStyleId = (node as any).fillStyleId;
      if (fillStyleId) {
        let hasStyleChange = false;
        
        // Verificar se está dentro de componente DS para análise hierárquica
        let rootDSInstance: InstanceNode | null = null;
        let currentParent = node.parent;
        
        while (currentParent && currentParent.type !== 'PAGE') {
          if (currentParent.type === 'INSTANCE') {
            const componentStatus = await isComponentFromDSAsync(currentParent as InstanceNode, componentsData);
            if (componentStatus.isFromDS) {
              rootDSInstance = currentParent as InstanceNode;
            }
          }
          currentParent = currentParent.parent;
        }
        
        if (!rootDSInstance && node.type === 'INSTANCE') {
          const componentStatus = await isComponentFromDSAsync(node as InstanceNode, componentsData);
          if (componentStatus.isFromDS) {
            rootDSInstance = node as InstanceNode;
          }
        }
        
        // Verificar se é um componente que permite alteração quando usado diretamente
        // Verificar no rootDSInstance (componente pai) ao invés do nó atual
        const isDirectUseAllowed = rootDSInstance ? await isDirectUseAllowedComponent(rootDSInstance, componentsData) : false;
        console.log(`🎯 [FILL] Node: ${node.name}, isDirectUseAllowed: ${isDirectUseAllowed}, rootDSInstance: ${rootDSInstance?.name || 'null'}`);
        
        // Se é um componente de uso direto permitido, pular a análise hierárquica
        if (isDirectUseAllowed) {
          console.log(`✅ [FILL] Componente de uso direto permitido, pulando análise: ${node.name}`);
          // Não fazer nada - permitir a alteração
        }
        // Análise hierárquica otimizada apenas para componentes DS (exceto componentes de uso direto)
        else if (rootDSInstance && !isDirectUseAllowed) {
          try {
            const mainComponent = await rootDSInstance.getMainComponentAsync();
            if (mainComponent) {
              const nodePath = buildNodePath(node, rootDSInstance);
              let contextNode = findByPath(mainComponent, nodePath);
              
              // Se não encontrou por nome exato, tentar por posição estrutural
              if (!contextNode && nodePath.length > 0) {
                contextNode = findByStructuralPosition(mainComponent, nodePath, 'fillStyleId');
              }
              
              if (contextNode && 'fillStyleId' in contextNode) {
                const contextStyleId = (contextNode as any).fillStyleId;
                if (contextStyleId && contextStyleId !== fillStyleId) {
                  hasStyleChange = true;
                  const currentFromDS = isStyleInDesignSystem(fillStyleId, 'colorStyles', stylesData);
                  const contextFromDS = isStyleInDesignSystem(contextStyleId, 'colorStyles', stylesData);
                  
                  // PRIORIZAR: Sempre mostrar como alteração quando estamos em componente DS
                  nonCompliantColors++;
                  try {
                    const currentStyleName = (await figma.getStyleByIdAsync(fillStyleId))?.name || 'Estilo desconhecido';
                    const originalStyleName = (await figma.getStyleByIdAsync(contextStyleId))?.name || 'Estilo original desconhecido';
                    
                    // Determinar o tipo de alteração baseado nos estilos
                    const issueType = currentFromDS && contextFromDS ? 'changed' : 'changed';
                    const reason = currentFromDS && contextFromDS 
                      ? 'Estilo alterado no componente (fill)'
                      : 'Estilo alterado em relação ao componente pai (fill)';
                    
                    issues.push({
                      nodeId: node.id,
                      nodeName: node.name,
                      styleId: fillStyleId,
                      currentStyle: currentStyleName,
                      originalStyle: originalStyleName,
                      type: issueType,
                      reason: reason,
                      frameName: findFrameName(node)
                    });
                  } catch (styleError) {
                    issues.push({
                      nodeId: node.id,
                      nodeName: node.name,
                      styleId: fillStyleId,
                      type: 'changed',
                      reason: 'Estilo alterado em relação ao componente pai (fill)',
                      frameName: findFrameName(node)
                    });
                  }
                }
              }
            }
          } catch (error) {
            // Silenciar erros para melhor performance
          }
        }
        
        // Verificação padrão se não houve mudança de estilo
        if (!hasStyleChange) {
          let isFromDS = styleCache.get(`fill-${fillStyleId}`);
          if (isFromDS === undefined) {
            isFromDS = isStyleInDesignSystem(fillStyleId, 'colorStyles', stylesData);
            styleCache.set(`fill-${fillStyleId}`, isFromDS);
          }
          
          if (!isFromDS) {
            nonCompliantColors++;
            try {
              const currentStyleName = (await figma.getStyleByIdAsync(fillStyleId))?.name || 'Estilo desconhecido';
              issues.push({
                nodeId: node.id,
                nodeName: node.name,
                styleId: fillStyleId,
                currentStyle: currentStyleName,
                type: 'invalid',
                reason: 'Estilo não encontrado no DS (fill)',
                frameName: findFrameName(node)
              });
            } catch (styleError) {
              issues.push({
                nodeId: node.id,
                nodeName: node.name,
                styleId: fillStyleId,
                type: 'invalid',
                reason: 'Estilo não encontrado no DS (fill)',
                frameName: findFrameName(node)
              });
            }
          }
        }
      } else if (hasNonImageFills(node)) {
        // Verificar se está dentro de componente DS para análise hierárquica
        let rootDSInstance: InstanceNode | null = null;
        let currentParent = node.parent;
        
        while (currentParent && currentParent.type !== 'PAGE') {
          if (currentParent.type === 'INSTANCE') {
            const componentStatus = await isComponentFromDSAsync(currentParent as InstanceNode, componentsData);
            if (componentStatus.isFromDS) {
              rootDSInstance = currentParent as InstanceNode;
            }
          }
          currentParent = currentParent.parent;
        }
        
        if (!rootDSInstance && node.type === 'INSTANCE') {
          const componentStatus = await isComponentFromDSAsync(node as InstanceNode, componentsData);
          if (componentStatus.isFromDS) {
            rootDSInstance = node as InstanceNode;
          }
        }
        
        let hasStyleChange = false;
        
        // Se está em componente DS, verificar se houve alteração
        if (rootDSInstance) {
          try {
            const mainComponent = await rootDSInstance.getMainComponentAsync();
            if (mainComponent) {
              const nodePath = buildNodePath(node, rootDSInstance);
              let contextNode = findByPath(mainComponent, nodePath);
              
              if (!contextNode && nodePath.length > 0) {
                contextNode = findByStructuralPosition(mainComponent, nodePath, 'fillStyleId');
              }
              
              if (contextNode && 'fillStyleId' in contextNode) {
                const contextStyleId = (contextNode as any).fillStyleId;
                if (contextStyleId) {
                  hasStyleChange = true;
                  nonCompliantColors++;
                  
                  // Capturar o valor hexadecimal atual
                  let currentValue = undefined;
                  if ('fills' in node && Array.isArray((node as any).fills)) {
                    const fills = (node as any).fills;
                    const solidFill = fills.find((fill: any) => fill.type === 'SOLID' && fill.visible !== false);
                    if (solidFill && solidFill.color) {
                      const r = Math.round(solidFill.color.r * 255);
                      const g = Math.round(solidFill.color.g * 255);
                      const b = Math.round(solidFill.color.b * 255);
                      currentValue = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    }
                  }
                  
                  try {
                    const originalStyleName = (await figma.getStyleByIdAsync(contextStyleId))?.name || 'Estilo original desconhecido';
                    issues.push({
                      nodeId: node.id,
                      nodeName: node.name,
                      styleId: contextStyleId,
                      currentStyle: 'Valor personalizado',
                      originalStyle: originalStyleName,
                      type: 'changed',
                      reason: 'Estilo alterado em relação ao componente pai (fill)',
                      value: currentValue,
                      frameName: findFrameName(node)
                    });
                  } catch (styleError) {
                    issues.push({
                      nodeId: node.id,
                      nodeName: node.name,
                      type: 'changed',
                      reason: 'Estilo alterado em relação ao componente pai (fill)',
                      value: currentValue,
                      frameName: findFrameName(node)
                    });
                  }
                }
              }
            }
          } catch (error) {
            // Silenciar erros para melhor performance
          }
        }
        
        // Se não houve mudança de estilo, usar mensagem padrão
        if (!hasStyleChange) {
          nonCompliantColors++;
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            type: 'missing',
            reason: 'Sem estilo vinculado (fill)',
            frameName: findFrameName(node)
          });
        }
      }
    }

    // Check strokeStyleId
    if ('strokeStyleId' in node) {
      const strokeStyleId = (node as any).strokeStyleId;
      if (strokeStyleId) {
        let hasStyleChange = false;
        
        // Verificar se está dentro de componente DS para análise hierárquica
        let rootDSInstance: InstanceNode | null = null;
        let currentParent = node.parent;
        
        while (currentParent && currentParent.type !== 'PAGE') {
          if (currentParent.type === 'INSTANCE') {
            const componentStatus = await isComponentFromDSAsync(currentParent as InstanceNode, componentsData);
            if (componentStatus.isFromDS) {
              rootDSInstance = currentParent as InstanceNode;
            }
          }
          currentParent = currentParent.parent;
        }
        
        if (!rootDSInstance && node.type === 'INSTANCE') {
          const componentStatus = await isComponentFromDSAsync(node as InstanceNode, componentsData);
          if (componentStatus.isFromDS) {
            rootDSInstance = node as InstanceNode;
          }
        }
        
        // Verificar se é um componente que permite alteração quando usado diretamente
        const isDirectUseAllowed = rootDSInstance ? await isDirectUseAllowedComponent(rootDSInstance, componentsData) : false;
        
        // Análise hierárquica otimizada apenas para componentes DS (exceto componentes de uso direto)
        if (rootDSInstance && !isDirectUseAllowed) {
          try {
            const mainComponent = await rootDSInstance.getMainComponentAsync();
            if (mainComponent) {
              const nodePath = buildNodePath(node, rootDSInstance);
              let contextNode = findByPath(mainComponent, nodePath);
              
              // Se não encontrou por nome exato, tentar por posição estrutural
              if (!contextNode && nodePath.length > 0) {
                contextNode = findByStructuralPosition(mainComponent, nodePath, 'strokeStyleId');
              }
              
              if (contextNode && 'strokeStyleId' in contextNode) {
                const contextStyleId = (contextNode as any).strokeStyleId;
                if (contextStyleId && contextStyleId !== strokeStyleId) {
                  hasStyleChange = true;
                  const currentFromDS = isStyleInDesignSystem(strokeStyleId, 'colorStyles', stylesData);
                  const contextFromDS = isStyleInDesignSystem(contextStyleId, 'colorStyles', stylesData);
                  
                  // PRIORIZAR: Sempre mostrar como alteração quando estamos em componente DS
                  nonCompliantColors++;
                  try {
                    const currentStyleName = (await figma.getStyleByIdAsync(strokeStyleId))?.name || 'Estilo desconhecido';
                    const originalStyleName = (await figma.getStyleByIdAsync(contextStyleId))?.name || 'Estilo original desconhecido';
                    
                    // Determinar o tipo de alteração baseado nos estilos
                    const issueType = currentFromDS && contextFromDS ? 'changed' : 'changed';
                    const reason = currentFromDS && contextFromDS 
                      ? 'Estilo alterado no componente (stroke)'
                      : 'Estilo alterado em relação ao componente pai (stroke)';
                    
                    issues.push({
                      nodeId: node.id,
                      nodeName: node.name,
                      styleId: strokeStyleId,
                      currentStyle: currentStyleName,
                      originalStyle: originalStyleName,
                      type: issueType,
                      reason: reason,
                      frameName: findFrameName(node)
                    });
                  } catch (styleError) {
                    issues.push({
                      nodeId: node.id,
                      nodeName: node.name,
                      styleId: strokeStyleId,
                      type: 'changed',
                      reason: 'Estilo alterado em relação ao componente pai (stroke)',
                      frameName: findFrameName(node)
                    });
                  }
                }
              }
            }
          } catch (error) {
            // Silenciar erros para melhor performance
          }
        }
        
        // Verificação padrão se não houve mudança de estilo
        if (!hasStyleChange) {
          let isFromDS = styleCache.get(`stroke-${strokeStyleId}`);
          if (isFromDS === undefined) {
            isFromDS = isStyleInDesignSystem(strokeStyleId, 'colorStyles', stylesData);
            styleCache.set(`stroke-${strokeStyleId}`, isFromDS);
          }
          
          if (!isFromDS) {
            nonCompliantColors++;
            try {
              const currentStyleName = (await figma.getStyleByIdAsync(strokeStyleId))?.name || 'Estilo desconhecido';
              issues.push({
                nodeId: node.id,
                nodeName: node.name,
                styleId: strokeStyleId,
                currentStyle: currentStyleName,
                type: 'invalid',
                reason: 'Estilo não encontrado no DS (stroke)',
                frameName: findFrameName(node)
              });
            } catch (styleError) {
              issues.push({
                nodeId: node.id,
                nodeName: node.name,
                styleId: strokeStyleId,
                type: 'invalid',
                reason: 'Estilo não encontrado no DS (stroke)',
                frameName: findFrameName(node)
              });
            }
          }
        }
      } else if (hasStrokes(node)) {
        // Verificar se está dentro de componente DS para análise hierárquica
        let rootDSInstance: InstanceNode | null = null;
        let currentParent = node.parent;
        
        while (currentParent && currentParent.type !== 'PAGE') {
          if (currentParent.type === 'INSTANCE') {
            const componentStatus = await isComponentFromDSAsync(currentParent as InstanceNode, componentsData);
            if (componentStatus.isFromDS) {
              rootDSInstance = currentParent as InstanceNode;
            }
          }
          currentParent = currentParent.parent;
        }
        
        if (!rootDSInstance && node.type === 'INSTANCE') {
          const componentStatus = await isComponentFromDSAsync(node as InstanceNode, componentsData);
          if (componentStatus.isFromDS) {
            rootDSInstance = node as InstanceNode;
          }
        }
        
        let hasStyleChange = false;
        
        // Se está em componente DS, verificar se houve alteração
        if (rootDSInstance) {
          try {
            const mainComponent = await rootDSInstance.getMainComponentAsync();
            if (mainComponent) {
              const nodePath = buildNodePath(node, rootDSInstance);
              let contextNode = findByPath(mainComponent, nodePath);
              
              if (!contextNode && nodePath.length > 0) {
                contextNode = findByStructuralPosition(mainComponent, nodePath, 'strokeStyleId');
              }
              
              if (contextNode && 'strokeStyleId' in contextNode) {
                const contextStyleId = (contextNode as any).strokeStyleId;
                if (contextStyleId) {
                  hasStyleChange = true;
                  nonCompliantColors++;
                  
                  // Capturar o valor hexadecimal atual
                  let currentValue = undefined;
                  if ('strokes' in node && Array.isArray((node as any).strokes)) {
                    const strokes = (node as any).strokes;
                    const solidStroke = strokes.find((stroke: any) => stroke.type === 'SOLID' && stroke.visible !== false);
                    if (solidStroke && solidStroke.color) {
                      const r = Math.round(solidStroke.color.r * 255);
                      const g = Math.round(solidStroke.color.g * 255);
                      const b = Math.round(solidStroke.color.b * 255);
                      currentValue = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    }
                  }
                  
                  try {
                    const originalStyleName = (await figma.getStyleByIdAsync(contextStyleId))?.name || 'Estilo original desconhecido';
                    issues.push({
                      nodeId: node.id,
                      nodeName: node.name,
                      styleId: contextStyleId,
                      currentStyle: 'Valor personalizado',
                      originalStyle: originalStyleName,
                      type: 'changed',
                      reason: 'Estilo alterado em relação ao componente pai (stroke)',
                      value: currentValue,
                      frameName: findFrameName(node)
                    });
                  } catch (styleError) {
                    issues.push({
                      nodeId: node.id,
                      nodeName: node.name,
                      type: 'changed',
                      reason: 'Estilo alterado em relação ao componente pai (stroke)',
                      value: currentValue,
                      frameName: findFrameName(node)
                    });
                  }
                }
              }
            }
          } catch (error) {
            // Silenciar erros para melhor performance
          }
        }
        
        // Se não houve mudança de estilo, usar mensagem padrão
        if (!hasStyleChange) {
          nonCompliantColors++;
          issues.push({
            nodeId: node.id,
            nodeName: node.name,
            type: 'missing',
            reason: 'Sem estilo vinculado (stroke)',
            frameName: findFrameName(node)
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao analisar cores:', error);
  }

  // Garantir que temos um array de issues mesmo que vazio
  return { 
    count: nonCompliantColors, 
    issues: issues || [] 
  };
}

async function analyzeNodeFonts(node: SceneNode, stylesData: StylesData[], componentsData: ComponentData[]): Promise<{ count: number; issues: StyleIssue[] }> {
  let nonCompliantFonts = 0;
  const issues: StyleIssue[] = [];
  
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
          const issue: StyleIssue = {
            nodeId: node.id,
            nodeName: node.name,
            type: 'missing',
            reason: 'Texto com múltiplos estilos - Nenhum estilo de texto aplicado',
            value: typeof textNode.fontName === 'symbol' ? undefined : JSON.stringify(textNode.fontName),
            frameName: findFrameName(node)
          };
          issues.push(issue);
          console.log(`  ❌ Texto com múltiplos estilos não conforme:`, issue);
        } else {
          // Apenas verificar se os estilos são do DS, sem comparar alterações
          for (const styleId of styleIds) {
            console.log(`  Text Style:`, {
              nodeId: node.id,
              nodeName: node.name,
              styleId: styleId,
              hasStyle: Boolean(styleId)
            });

            if (!styleId || !isStyleInDesignSystem(styleId, 'textStyles', stylesData)) {
              hasNonCompliantSegment = true;
              const issue: StyleIssue = {
                nodeId: node.id,
                nodeName: node.name,
                type: 'missing',
                reason: !styleId ? 'Segmento sem estilo vinculado' : 'Segmento com estilo não encontrado no DS',
                value: typeof textNode.fontName === 'symbol' ? undefined : JSON.stringify(textNode.fontName),
                frameName: findFrameName(node)
              };
              issues.push(issue);
              console.log(`  ❌ Segmento não conforme encontrado:`, issue);
            } else {
              console.log(`  ✅ Segmento conforme`);
            }
          }
          
          if (hasNonCompliantSegment) {
            nonCompliantFonts = 1;
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

        let hasStyleChange = false;
        
        if (textStyleId) {
          // Verificar se está dentro de componente DS para análise hierárquica
          let rootDSInstance: InstanceNode | null = null;
          let currentParent = node.parent;
          
          while (currentParent && currentParent.type !== 'PAGE') {
            if (currentParent.type === 'INSTANCE') {
              const componentStatus = await isComponentFromDSAsync(currentParent as InstanceNode, componentsData);
              if (componentStatus.isFromDS) {
                rootDSInstance = currentParent as InstanceNode;
              }
            }
            currentParent = currentParent.parent;
          }
          

          
          // Análise hierárquica para componentes DS
          if (rootDSInstance) {
            try {
              const mainComponent = await rootDSInstance.getMainComponentAsync();
              if (mainComponent) {
                const nodePath = buildNodePath(node, rootDSInstance);
                let contextNode = findByPath(mainComponent, nodePath);
                
                // Se não encontrou por nome exato, tentar por posição estrutural
                if (!contextNode && nodePath.length > 0) {
                  contextNode = findByStructuralPosition(mainComponent, nodePath, 'textStyleId');
                }
                
                if (contextNode && contextNode.type === 'TEXT' && 'textStyleId' in contextNode) {
                  const contextStyleId = (contextNode as any).textStyleId;
                  if (contextStyleId && contextStyleId !== textStyleId) {
                    hasStyleChange = true;
                    const currentFromDS = isStyleInDesignSystem(textStyleId, 'textStyles', stylesData);
                    const contextFromDS = isStyleInDesignSystem(contextStyleId, 'textStyles', stylesData);
                    
                    // PRIORIZAR: Sempre mostrar como alteração quando estamos em componente DS
                    nonCompliantFonts++;
                    try {
                      const currentStyleName = (await figma.getStyleByIdAsync(textStyleId))?.name || 'Estilo desconhecido';
                      const originalStyleName = (await figma.getStyleByIdAsync(contextStyleId))?.name || 'Estilo original desconhecido';
                      
                      // Determinar o tipo de alteração baseado nos estilos
                      const issueType = currentFromDS && contextFromDS ? 'changed' : 'changed';
                      const reason = currentFromDS && contextFromDS 
                        ? 'Estilo alterado no componente (text)'
                        : 'Estilo alterado em relação ao componente pai (text)';
                      
                      issues.push({
                        nodeId: node.id,
                        nodeName: node.name,
                        styleId: textStyleId,
                        currentStyle: currentStyleName,
                        originalStyle: originalStyleName,
                        type: issueType,
                        reason: reason,
                        frameName: findFrameName(node)
                      });
                    } catch (styleError) {
                      issues.push({
                        nodeId: node.id,
                        nodeName: node.name,
                        styleId: textStyleId,
                        type: 'changed',
                        reason: 'Estilo alterado em relação ao componente pai (text)',
                        frameName: findFrameName(node)
                      });
                    }
                  }
                }
              }
            } catch (error) {
              // Silenciar erros para melhor performance
            }
          }
        }
        
        // Se não houve mudança de estilo, verificar se está em componente DS
        if (!hasStyleChange) {
          if (!textStyleId) {
            // Verificar se está dentro de componente DS para análise hierárquica
            let rootDSInstance: InstanceNode | null = null;
            let currentParent = node.parent;
            
            while (currentParent && currentParent.type !== 'PAGE') {
              if (currentParent.type === 'INSTANCE') {
                const componentStatus = await isComponentFromDSAsync(currentParent as InstanceNode, componentsData);
                if (componentStatus.isFromDS) {
                  rootDSInstance = currentParent as InstanceNode;
                }
              }
              currentParent = currentParent.parent;
            }
            
            let hasTextStyleChange = false;
            
            // Se está em componente DS, verificar se houve alteração
            if (rootDSInstance) {
              try {
                const mainComponent = await rootDSInstance.getMainComponentAsync();
                if (mainComponent) {
                  const nodePath = buildNodePath(node, rootDSInstance);
                  let contextNode = findByPath(mainComponent, nodePath);
                  
                  if (!contextNode && nodePath.length > 0) {
                    contextNode = findByStructuralPosition(mainComponent, nodePath, 'textStyleId');
                  }
                  
                  if (contextNode && contextNode.type === 'TEXT' && 'textStyleId' in contextNode) {
                    const contextStyleId = (contextNode as any).textStyleId;
                    if (contextStyleId) {
                      hasTextStyleChange = true;
                      nonCompliantFonts = 1;
                      try {
                        const originalStyleName = (await figma.getStyleByIdAsync(contextStyleId))?.name || 'Estilo original desconhecido';
                        issues.push({
                          nodeId: node.id,
                          nodeName: node.name,
                          styleId: contextStyleId,
                          originalStyle: originalStyleName,
                          type: 'changed',
                          reason: 'Estilo removido em relação ao componente pai (text)',
                          frameName: findFrameName(node)
                        });
                      } catch (styleError) {
                        issues.push({
                          nodeId: node.id,
                          nodeName: node.name,
                          type: 'changed',
                          reason: 'Estilo removido em relação ao componente pai (text)',
                          frameName: findFrameName(node)
                        });
                      }
                    }
                  }
                }
              } catch (error) {
                // Silenciar erros para melhor performance
              }
            }
            
            // Se não houve mudança de estilo, usar mensagem padrão
            if (!hasTextStyleChange) {
              nonCompliantFonts = 1;
              const issue: StyleIssue = {
                nodeId: node.id,
                nodeName: node.name,
                type: 'missing',
                reason: 'Texto sem estilo vinculado',
                value: formatFontName(textNode.fontName),
                frameName: findFrameName(node)
              };
              issues.push(issue);
              console.log(`  ❌ Fonte não conforme encontrada:`, issue);
            }
          } else if (!isStyleInDesignSystem(textStyleId, 'textStyles', stylesData)) {
            nonCompliantFonts = 1;
            const issue: StyleIssue = {
              nodeId: node.id,
              nodeName: node.name,
              type: 'missing',
              reason: 'Estilo não encontrado no DS',
              value: formatFontName(textNode.fontName),
              frameName: findFrameName(node)
            };
            issues.push(issue);
            console.log(`  ❌ Fonte não conforme encontrada:`, issue);
          } else {
            console.log(`  ✅ Fonte conforme`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro ao analisar fontes:', error);
  }
  
  return { count: nonCompliantFonts, issues };
}

async function analyzeNodeEffects(node: SceneNode, stylesData: StylesData[]): Promise<{ count: number; issues: StyleIssue[] }> {
  let nonCompliantEffects = 0;
  const issues: StyleIssue[] = [];
  
  if ('effectStyleId' in node) {
    const effectStyleId = (node as any).effectStyleId;
    if (effectStyleId) {
      console.log(`  Effect Style:`, {
        nodeId: node.id,
        nodeName: node.name,
        styleId: effectStyleId,
        hasStyle: true
    });
    
      // Verificar alterações para efeitos apenas se for instância
      let hasStyleChange = false;
      if (node.type === 'INSTANCE') {
        const instance = node as InstanceNode;
        try {
          const mainComponent = await instance.getMainComponentAsync();
          if (mainComponent) {
            const mainNode = mainComponent.findOne(n => n.name === node.name && n.type === node.type);
            if (mainNode && 'effectStyleId' in mainNode) {
              const mainStyle = (mainNode as any).effectStyleId;
              if (mainStyle && mainStyle !== effectStyleId) {
                hasStyleChange = true;
                // Se ambos os estilos são do DS, é uma alteração não conforme e deve ser contabilizada
                const bothFromDS = isStyleInDesignSystem(effectStyleId, 'effectStyles', stylesData) &&
                                 isStyleInDesignSystem(mainStyle, 'effectStyles', stylesData);
                if (bothFromDS) {
                  nonCompliantEffects++;
                  const issue: StyleIssue = {
                    nodeId: node.id,
                    nodeName: node.name,
                    styleId: effectStyleId,
                    currentStyle: (await figma.getStyleByIdAsync(effectStyleId))?.name,
                    originalStyle: (await figma.getStyleByIdAsync(mainStyle))?.name,
                    type: 'changed',
                    reason: 'Alterado para outro estilo do DS (effect)',
                    frameName: findFrameName(node)
                  };
                  issues.push(issue);
                  console.log(`  ⚠️ Alterado para outro estilo do DS (effect):`, issue);
                } else if (!isStyleInDesignSystem(effectStyleId, 'effectStyles', stylesData)) {
                  nonCompliantEffects++;
                  const issue: StyleIssue = {
                    nodeId: node.id,
                    nodeName: node.name,
                    styleId: effectStyleId,
                    currentStyle: (await figma.getStyleByIdAsync(effectStyleId))?.name,
                    type: 'invalid',
                    reason: 'Estilo não encontrado no DS (effect)',
                    frameName: findFrameName(node)
                  };
                  issues.push(issue);
                  console.log(`  ❌ Efeito não conforme encontrado:`, issue);
                }
              }
            }
          }
        } catch (error) {
          console.error('Erro ao buscar componente principal:', error);
        }
      }
      
      // Se não houve mudança de estilo, apenas verificar se é do DS
      if (!hasStyleChange) {
        if (!isStyleInDesignSystem(effectStyleId, 'effectStyles', stylesData)) {
          nonCompliantEffects++;
          const issue: StyleIssue = {
            nodeId: node.id,
            nodeName: node.name,
            styleId: effectStyleId,
            currentStyle: (await figma.getStyleByIdAsync(effectStyleId))?.name,
            type: 'invalid',
            reason: 'Estilo não encontrado no DS (effect)',
            frameName: findFrameName(node)
          };
          issues.push(issue);
          console.log(`  ❌ Efeito não conforme encontrado:`, issue);
        } else {
          console.log(`  ✅ Efeito conforme`);
        }
      }
    } else if (hasEffects(node)) {
      // If node has effects but no style, count as non-compliant
      nonCompliantEffects++;
      const effectsValue = ('effects' in node && Array.isArray((node as any).effects))
        ? (node as any).effects.map((effect: any) => effect.type).join(', ')
        : undefined;

      const issue: StyleIssue = {
        nodeId: node.id,
        nodeName: node.name,
        type: 'missing',
        reason: 'Sem estilo vinculado',
        value: effectsValue,
        frameName: findFrameName(node)
      };
      issues.push(issue);
      console.log(`  ❌ Efeito não conforme encontrado:`, issue);
    }
  }
  
  return { count: nonCompliantEffects, issues };
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

// Versão otimizada com cache
async function isComponentFromDSAsync(node: SceneNode, componentsData: ComponentData[]): Promise<{ isFromDS: boolean; isHidden: boolean }> {
  try {
    if (node.type === 'INSTANCE') {
      const instance = node as InstanceNode;
      
      // Verificar cache primeiro
      const cached = dsComponentCache.get(instance.id);
      if (cached) {
        return cached;
      }
      
      const mainComponent = await instance.getMainComponentAsync();
      if (mainComponent) {
        let foundComponent: { isFromDS: boolean; isHidden: boolean } = { isFromDS: false, isHidden: false };
        
        for (const data of componentsData) {
          for (const [name, comp] of Object.entries(data.components || {})) {
            try {
              const matchVariant = comp.key === mainComponent.key;
              const matchParent = mainComponent.parent?.type === 'COMPONENT_SET' &&
                comp.key === (mainComponent.parent as ComponentSetNode).key;
              
              if (matchVariant || matchParent) {
                foundComponent = {
                  isFromDS: true,
                  isHidden: comp.isHidden || false
                };
                break;
              }
            } catch (error) {
              continue;
            }
          }
          if (foundComponent.isFromDS) break;
        }
        
        // Armazenar no cache
        dsComponentCache.set(instance.id, foundComponent);
        return foundComponent;
      }
    }
  } catch (error) {
    // Silenciar erros para melhor performance
  }
  return { isFromDS: false, isHidden: false };
}

// Helper function to check if a node has any styles applied or modified
async function hasAppliedStyles(node: SceneNode): Promise<boolean> {
  // Não verificar alterações de estilos
  const mainNode = null;
  
  if (mainNode) {
    // Check fill style changes
    if ('fillStyleId' in node && 'fillStyleId' in mainNode) {
      const currentFill = (node as any).fillStyleId;
      const mainFill = (mainNode as any).fillStyleId;
      if (currentFill && mainFill && currentFill !== mainFill) {
        return true;
      }
    }

    // Check stroke style changes
    if ('strokeStyleId' in node && 'strokeStyleId' in mainNode) {
      const currentStroke = (node as any).strokeStyleId;
      const mainStroke = (mainNode as any).strokeStyleId;
      if (currentStroke && mainStroke && currentStroke !== mainStroke) {
        return true;
      }
    }

    // Check effect style changes
    if ('effectStyleId' in node && 'effectStyleId' in mainNode) {
      const currentEffect = (node as any).effectStyleId;
      const mainEffect = (mainNode as any).effectStyleId;
      if (currentEffect && mainEffect && currentEffect !== mainEffect) {
        return true;
      }
    }
  }

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

function formatFontName(fontName: FontName | typeof figma.mixed): string | undefined {
  if (typeof fontName === 'symbol') return undefined;
  return `${fontName.family} ${fontName.style}`;
}

async function analyzeSingleNodeAsync(
  node: SceneNode,
  componentsData: ComponentData[],
  stylesData: StylesData[],
  isTopLevel: boolean = true,
  isInsideDsComponent: boolean = false,
  depth: number = 0
): Promise<AnalysisResult & { shouldSkipChildren?: boolean }> {
  try {
    // Limitar profundidade para evitar estouro de memória
    if (depth > MAX_DEPTH) {
      return {
        nonCompliantColors: 0,
        nonCompliantFonts: 0,
        nonCompliantEffects: 0,
        nonDsComponents: 0,
        totalLayers: 0,
        dsComponentsUsed: 0,
        hiddenComponentsUsed: 0,
        shouldSkipChildren: true,
        details: { colors: [], fonts: [], effects: [], components: [] }
      };
    }
    const details = createEmptyDetails();
    let nonDsComponents = 0;
    let totalLayers = 0;
    let dsComponentsUsed = 0;
    let hiddenComponentsUsed = 0;
    let nonCompliantColors = 0;
    let nonCompliantFonts = 0;
    let nonCompliantEffects = 0;
    if (node.type === 'INSTANCE') {
      const instance = node as InstanceNode;
      const mainComponent = await instance.getMainComponentAsync();
      const isExternalLibrary = mainComponent && mainComponent.remote === true;
      const componentStatus = await isComponentFromDSAsync(node, componentsData);
      // Nova regra: ignorar estilos se descrição do componente do DS contiver palavra-chave
      if (componentStatus.isFromDS && mainComponent && shouldIgnoreStylesByDescription(mainComponent.description)) {
        console.log('ℹ️ Componente DS aninhado encontrado (não contabilizado):', node);
        return {
          nonCompliantColors: 0,
          nonCompliantFonts: 0,
          nonCompliantEffects: 0,
          nonDsComponents: 0,
          totalLayers: 1,
          dsComponentsUsed: 1,
          hiddenComponentsUsed: 0,
          shouldSkipChildren: true,
          details: {
            colors: [],
            fonts: [],
            effects: [],
            components: []
          }
        };
      }
      if (isExternalLibrary && hasIgnoredPrefix(node.name)) {
        console.log('➖ Instância de biblioteca externa ignorada por prefixo:', node);
        return {
          nonCompliantColors: 0,
          nonCompliantFonts: 0,
          nonCompliantEffects: 0,
          nonDsComponents: 0,
          totalLayers: 1,
          dsComponentsUsed: 0,
          hiddenComponentsUsed: 0,
          shouldSkipChildren: true,
          details: {
            colors: [],
            fonts: [],
            effects: [],
            components: []
          }
        };
      }
      // Lógica de análise para instâncias
      const isLocalComponent = mainComponent && mainComponent.remote === false && !componentStatus.isFromDS;
      if (componentStatus.isFromDS) {
        if (componentStatus.isHidden) {
          console.log('ℹ️ Componente oculto encontrado (dentro de componente DS):', node);
          hiddenComponentsUsed = 1;
          if (!isInsideDsComponent) {
            nonDsComponents = 1;
            totalLayers = 1;
            console.log('➕ Layer contabilizada:', node);
          }
        } else if (!isInsideDsComponent) {
          dsComponentsUsed = 1;
          totalLayers = 1;
          console.log('✅ Componente do DS encontrado:', node);
        } else {
          console.log('ℹ️ Componente DS aninhado encontrado (não contabilizado):', node);
        }
      } else if (isLocalComponent) {
        const hasStyles = await hasAppliedStyles(node);
        if (!IGNORED_FRAME_NAMES.includes(node.name) && !isTopLevel && hasStyles) {
          totalLayers = 1;
          console.log('➕ Layer contabilizada:', node);
        } else {
          console.log('➖ Layer não contabilizada:', node);
        }
      } else {
        nonDsComponents = 1;
        if (!IGNORED_FRAME_NAMES.includes(node.name) && !isTopLevel) {
          totalLayers = 1;
          // Adicionar aos detalhes de componentes não-DS
          (details.components as StyleIssue[]).push({
            nodeId: node.id,
            nodeName: node.name,
            type: 'missing',
            reason: 'Componente fora do Design System',
            frameName: findFrameName(node)
          });
          console.log('➕ Layer contabilizada:', node);
        } else {
          console.log('➖ Layer não contabilizada:', node);
        }

      }
      // Análise de estilos
      const colorResults = await analyzeNodeColors(node, stylesData, componentsData);
      const fontResults = await analyzeNodeFonts(node, stylesData, componentsData);
      const effectResults = await analyzeNodeEffects(node, stylesData);
      
      nonCompliantColors = colorResults?.count || 0;
      nonCompliantFonts = fontResults?.count || 0;
      nonCompliantEffects = effectResults?.count || 0;

      (details.colors as StyleIssue[]).push(...colorResults.issues);
      (details.fonts as StyleIssue[]).push(...fontResults.issues);
      (details.effects as StyleIssue[]).push(...effectResults.issues);
      
      if (nonCompliantFonts > 0) {
        console.log('❌ Fontes não permitidas encontradas:', node);
      }
    } else {
      const hasStyles = await hasAppliedStyles(node);
      const shouldCountAsLayer = !EXCLUDED_NODE_TYPES.includes(node.type) &&
        !isTopLevel &&
        !IGNORED_FRAME_NAMES.includes(node.name) &&
        !isInsideDsComponent &&
        (node.type !== 'FRAME' || hasStyles);
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
            console.log('✅ Texto conforme DS contabilizado como componente do DS', node);
          } else {
            console.log('➕ Layer de texto contabilizada (não conforme DS):', node);
          }
        } else {
          console.log('➕ Layer contabilizada:', node);
        }
      } else {
        console.log('➖ Layer não contabilizada:', node);
      }
      // Análise de estilos
      const colorResults = await analyzeNodeColors(node, stylesData, componentsData);
      const fontResults = await analyzeNodeFonts(node, stylesData, componentsData);
      const effectResults = await analyzeNodeEffects(node, stylesData);

      (details.colors as StyleIssue[]).push(...(colorResults?.issues || []));
      (details.fonts as StyleIssue[]).push(...(fontResults?.issues || []));
      (details.effects as StyleIssue[]).push(...(effectResults?.issues || []));
      
      nonCompliantColors = colorResults?.count || 0;
      nonCompliantFonts = fontResults?.count || 0;
      nonCompliantEffects = effectResults?.count || 0;
      
      if (nonCompliantFonts > 0) {
        console.log('❌ Fontes não permitidas encontradas:', node);
      }
    }
    return {
      nonCompliantColors,
      nonCompliantFonts,
      nonCompliantEffects,
      nonDsComponents,
      totalLayers,
      dsComponentsUsed,
      hiddenComponentsUsed,
      shouldSkipChildren: false,
      details
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
      shouldSkipChildren: false,
      details: {
        colors: [],
        fonts: [],
        effects: [],
        components: []
      }
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
  isInsideDsComponent: boolean = false,
  depth: number = 0
): Promise<AnalysisResult & { shouldSkipChildren?: boolean }> {
  try {
    if (isTopLevel) {
      // Limpar caches periodicamente
      if (dsComponentCache.size > 1000) dsComponentCache.clear();
      if (styleCache.size > 1000) styleCache.clear();
    }
    const result = await analyzeSingleNodeAsync(node, componentsData, stylesData, isTopLevel, isInsideDsComponent, depth);
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
            isInsideDsComponent || isDsComponent,
            depth + 1
          );
          // Acumular contadores
          result.nonCompliantColors += childResult.nonCompliantColors;
          result.nonCompliantFonts += childResult.nonCompliantFonts;
          result.nonCompliantEffects += childResult.nonCompliantEffects;
          result.nonDsComponents += childResult.nonDsComponents;
          if (!isDsComponent) {
            result.totalLayers += childResult.totalLayers;
            result.dsComponentsUsed += childResult.dsComponentsUsed;
          }
          result.hiddenComponentsUsed += childResult.hiddenComponentsUsed;
          
          // Acumular os detalhes dos problemas
          if (childResult.details) {
            if (!result.details) {
              result.details = {
                colors: [],
                fonts: [],
                effects: [],
                components: []
              };
            }
            result.details.colors.push(...childResult.details.colors);
            result.details.fonts.push(...childResult.details.fonts);
            result.details.effects.push(...childResult.details.effects);
            result.details.components.push(...childResult.details.components);
          }
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

// Versão assíncrona de analyzeFrame
export async function analyzeFrame(
  frame: FrameNode,
  componentsData: ComponentData[],
  stylesData: StylesData[]
): Promise<ComplianceReport> {
  try {
    const analysis = await analyzeNodeAsync(frame, componentsData, stylesData, false, true);
    const validLayers = analysis.totalLayers;
    const coveragePercentage = (validLayers + analysis.nonCompliantColors + analysis.nonCompliantFonts + analysis.nonCompliantEffects + analysis.nonDsComponents) > 0
      ? (analysis.dsComponentsUsed / (validLayers + analysis.nonCompliantColors + analysis.nonCompliantFonts + analysis.nonCompliantEffects + analysis.nonDsComponents)) * 100
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
    // Log detalhado das métricas finais
    console.log('\n📊 MÉTRICAS FINAIS DA ANÁLISE:');
    console.log(`Frame: ${frame.name}`);
    console.log(`Total de Layers: ${validLayers}`);
    console.log(`Componentes DS: ${analysis.dsComponentsUsed}`);
    console.log(`Componentes ocultos: ${analysis.hiddenComponentsUsed}`);
    console.log(`Cores não conformes: ${analysis.nonCompliantColors}`);
    console.log(`Fontes não conformes: ${analysis.nonCompliantFonts}`);
    console.log(`Efeitos não conformes: ${analysis.nonCompliantEffects}`);
    console.log(`Componentes não DS: ${analysis.nonDsComponents}`);
    console.log(`Cobertura: ${Math.round(coveragePercentage)}% (${coverageLevel.label})`);
    
    // Log dos detalhes dos problemas encontrados
    if (analysis.details) {
      console.log('\n🔍 DETALHES DOS PROBLEMAS:');
      if (analysis.details.colors.length > 0) {
        console.log('Cores não conformes:', analysis.details.colors.length);
        analysis.details.colors.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.reason} - ${issue.nodeName}`);
        });
      }
      if (analysis.details.fonts.length > 0) {
        console.log('Fontes não conformes:', analysis.details.fonts.length);
        analysis.details.fonts.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.reason} - ${issue.nodeName}`);
        });
      }
      if (analysis.details.effects.length > 0) {
        console.log('Efeitos não conformes:', analysis.details.effects.length);
        analysis.details.effects.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.reason} - ${issue.nodeName}`);
        });
      }
      if (analysis.details.components.length > 0) {
        console.log('Componentes não conformes:', analysis.details.components.length);
        analysis.details.components.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.reason} - ${issue.nodeName}`);
        });
      }
    }
    
    const report = {
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
        components: analysis.nonDsComponents,
        details: analysis.details
      }
    };
    
    return report;
  } catch (error) {
    if (typeof figma !== 'undefined' && figma.ui) {
      figma.ui.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
    throw error;
  }
}

// Helper function to find the frame name for a node
function findFrameName(node: SceneNode): string {
  let current = node.parent;
  while (current && current.type !== 'PAGE') {
    if (current.type === 'FRAME') {
      return current.name;
    }
    current = current.parent;
  }
  return 'Unknown Frame';
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

// Funções helper otimizadas
function buildNodePath(targetNode: SceneNode, rootInstance: InstanceNode): string[] {
  const path: string[] = [];
  let current = targetNode;
  
  while (current && current !== rootInstance) {
    path.unshift(current.name);
    current = current.parent as SceneNode;
  }
  return path;
}

function findByPath(parent: BaseNode, path: string[]): SceneNode | null {
  if (path.length === 0) return parent as SceneNode;
  
  if ('children' in parent) {
    for (const child of parent.children) {
      if (child.name === path[0]) {
        if (path.length === 1) {
          return child as SceneNode;
        } else {
          return findByPath(child, path.slice(1));
        }
      }
    }
  }
  return null;
}

function findByStructuralPosition(parent: BaseNode, path: string[], styleProperty: string, index: number = 0): SceneNode | null {
  if (index >= path.length) return parent as SceneNode;
  
  if ('children' in parent) {
    // Buscar por nome primeiro
    for (const child of parent.children) {
      if (child.name === path[index]) {
        return findByStructuralPosition(child, path, styleProperty, index + 1);
      }
    }
    
    // Se não encontrou por nome, buscar na mesma posição estrutural
    if (index < path.length) {
      for (const child of parent.children) {
        if ('children' in child || (index === path.length - 1 && styleProperty in child)) {
          const result = findByStructuralPosition(child, path, styleProperty, index + 1);
          if (result) {
            return result;
          }
        }
      }
    }
  }
  return null;
}

// Função para verificar se um componente pode ter estilos alterados quando usado diretamente
async function isDirectUseAllowedComponent(node: SceneNode, componentsData: ComponentData[]): Promise<boolean> {
  if (node.type !== 'INSTANCE') return false;
  
  try {
    const instance = node as InstanceNode;
    const mainComponent = await instance.getMainComponentAsync();
    if (!mainComponent) return false;
    
    console.log(`🔍 Verificando componente: ${mainComponent.name}`);
    
    // Verificar se o componente tem estrutura de ícone (nó "Icon" interno)
    const hasIconStructure = 'children' in mainComponent && 
      mainComponent.children.some(child => {
        const hasIcon = DIRECT_USE_ALLOWED_COMPONENTS.some(allowedName => 
          child.name.toLowerCase().includes(allowedName.toLowerCase())
        );
        console.log(`  - Filho: ${child.name}, hasIcon: ${hasIcon}`);
        return hasIcon;
      });
    
    console.log(`  - hasIconStructure: ${hasIconStructure}`);
    if (!hasIconStructure) return false;
    
    // Verificar se está sendo usado diretamente (não aninhado em outro componente DS)
    let parent = node.parent;
    let isNested = false;
    while (parent && parent.type !== 'PAGE') {
      if (parent.type === 'INSTANCE') {
        const parentStatus = await isComponentFromDSAsync(parent as InstanceNode, componentsData);
        if (parentStatus.isFromDS) {
          isNested = true;
          console.log(`  - Aninhado em componente DS: ${parent.name}`);
          break;
        }
      }
      parent = parent.parent;
    }
    
    const result = !isNested;
    console.log(`  - Resultado final: ${result}`);
    return result;
  } catch (error) {
    console.log(`  - Erro: ${error}`);
    return false;
  }
}