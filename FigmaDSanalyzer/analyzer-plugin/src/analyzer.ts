
import { AnalysisResult, ComponentData, StylesData, Violation } from './types';

export function analyzeNode(
  node: SceneNode, 
  componentsData: ComponentData[], 
  stylesData: StylesData[],
  skipComponentAnalysis: boolean = false
): AnalysisResult {
  const result: AnalysisResult = {
    colors: { compliant: 0, total: 0, violations: [] },
    fonts: { compliant: 0, total: 0, violations: [] },
    shadows: { compliant: 0, total: 0, violations: [] },
    components: { compliant: 0, total: 0, violations: [] }
  };

  // Análise de componentes
  if (!skipComponentAnalysis) {
    analyzeComponents(node, componentsData, result);
  }

  // Análise de cores
  analyzeColors(node, stylesData, result);

  // Análise de fontes
  analyzeFonts(node, stylesData, result);

  // Análise de efeitos/sombras
  analyzeEffects(node, stylesData, result);

  return result;
}

function analyzeComponents(
  node: SceneNode, 
  componentsData: ComponentData[], 
  result: AnalysisResult
): void {
  // Verifica se o nó é um componente ou instância
  if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    result.components.total++;
    
    // Para instâncias, verifica se é do design system
    if (node.type === 'INSTANCE') {
      const mainComponent = (node as InstanceNode).mainComponent;
      if (mainComponent) {
        const isFromDesignSystem = componentsData.some(data => 
          Object.values(data.components).some(comp => comp.key === mainComponent.key)
        );
        
        if (isFromDesignSystem) {
          result.components.compliant++;
        } else {
          result.components.violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: 'Componente não encontrado no Design System',
            currentValue: mainComponent.name,
            expectedValue: 'Componente do Design System'
          });
        }
      }
    }
    // Para componentes principais, verifica se estão no DS
    else if (node.type === 'COMPONENT') {
      const isFromDesignSystem = componentsData.some(data => 
        Object.values(data.components).some(comp => comp.key === (node as ComponentNode).key)
      );
      
      if (isFromDesignSystem) {
        result.components.compliant++;
      } else {
        result.components.violations.push({
          nodeId: node.id,
          nodeName: node.name,
          issue: 'Componente não encontrado no Design System',
          currentValue: node.name,
          expectedValue: 'Componente do Design System'
        });
      }
    }
  }
}

function analyzeColors(
  node: SceneNode, 
  stylesData: StylesData[], 
  result: AnalysisResult
): void {
  // Verifica fills
  if ('fills' in node && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill.type === 'SOLID' && fill.visible !== false) {
        result.colors.total++;
        
        // Verifica se a cor usa um estilo do design system
        const usesDesignSystemColor = stylesData.some(data => {
          return Object.values(data.colorStyles).some(styleId => {
            // Verifica se o fill tem um style ID que corresponde
            return fill.boundStyleId === styleId;
          });
        });
        
        if (usesDesignSystemColor) {
          result.colors.compliant++;
        } else {
          const color = fill.color;
          const hexColor = rgbToHex(color.r, color.g, color.b);
          result.colors.violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: 'Cor não encontrada no Design System',
            currentValue: hexColor,
            expectedValue: 'Cor do Design System'
          });
        }
      }
    }
  }

  // Verifica strokes
  if ('strokes' in node && Array.isArray(node.strokes)) {
    for (const stroke of node.strokes) {
      if (stroke.type === 'SOLID' && stroke.visible !== false) {
        result.colors.total++;
        
        const usesDesignSystemColor = stylesData.some(data => {
          return Object.values(data.colorStyles).some(styleId => {
            return stroke.boundStyleId === styleId;
          });
        });
        
        if (usesDesignSystemColor) {
          result.colors.compliant++;
        } else {
          const color = stroke.color;
          const hexColor = rgbToHex(color.r, color.g, color.b);
          result.colors.violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: 'Cor de borda não encontrada no Design System',
            currentValue: hexColor,
            expectedValue: 'Cor do Design System'
          });
        }
      }
    }
  }
}

function analyzeFonts(
  node: SceneNode, 
  stylesData: StylesData[], 
  result: AnalysisResult
): void {
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    result.fonts.total++;
    
    // Verifica se o texto usa um estilo do design system
    const usesDesignSystemFont = stylesData.some(data => {
      return Object.values(data.textStyles).some(styleId => {
        return textNode.textStyleId === styleId;
      });
    });
    
    if (usesDesignSystemFont) {
      result.fonts.compliant++;
    } else {
      const fontName = typeof textNode.fontName === 'object' ? 
        textNode.fontName.family : 'Mixed';
      result.fonts.violations.push({
        nodeId: node.id,
        nodeName: node.name,
        issue: 'Fonte não encontrada no Design System',
        currentValue: fontName,
        expectedValue: 'Fonte do Design System'
      });
    }
  }
}

function analyzeEffects(
  node: SceneNode, 
  stylesData: StylesData[], 
  result: AnalysisResult
): void {
  if ('effects' in node && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      if (effect.visible !== false) {
        result.shadows.total++;
        
        // Verifica se o efeito usa um estilo do design system
        const usesDesignSystemEffect = stylesData.some(data => {
          return Object.values(data.effectStyles).some(styleId => {
            return effect.boundStyleId === styleId;
          });
        });
        
        if (usesDesignSystemEffect) {
          result.shadows.compliant++;
        } else {
          result.shadows.violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: 'Efeito não encontrado no Design System',
            currentValue: effect.type,
            expectedValue: 'Efeito do Design System'
          });
        }
      }
    }
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => {
    const hex = Math.round(value * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
