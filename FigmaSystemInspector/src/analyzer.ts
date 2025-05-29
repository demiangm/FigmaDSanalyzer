import { AnalysisResult, DesignSystemConfig, ComplianceViolation } from './types';
import { hexToRgb, rgbToHex, isSimilarColor, extractTextStyles, extractEffects } from './utils';

export function analyzeNode(
  node: SceneNode, 
  designSystem: DesignSystemConfig, 
  skipComponentAnalysis: boolean = false
): AnalysisResult {
  const result: AnalysisResult = {
    colors: { compliant: 0, total: 0, violations: [] },
    fonts: { compliant: 0, total: 0, violations: [] },
    shadows: { compliant: 0, total: 0, violations: [] },
    components: { compliant: 0, total: 0, violations: [] }
  };

  // Analyze colors
  analyzeColors(node, designSystem.colors, result);
  
  // Analyze fonts
  analyzeFonts(node, designSystem.fonts, result);
  
  // Analyze shadows/effects
  analyzeShadows(node, designSystem.shadows, result);
  
  // Analyze components (if not skipped)
  if (!skipComponentAnalysis) {
    analyzeComponents(node, designSystem.componentPrefixes, result);
  }

  return result;
}

function analyzeColors(node: SceneNode, designSystemColors: string[], result: AnalysisResult) {
  const colors: string[] = [];

  // Extract fill colors
  if ('fills' in node && node.fills && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill.type === 'SOLID' && fill.color) {
        const hexColor = rgbToHex(fill.color.r * 255, fill.color.g * 255, fill.color.b * 255);
        colors.push(hexColor);
      }
    }
  }

  // Extract stroke colors
  if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
    for (const stroke of node.strokes) {
      if (stroke.type === 'SOLID' && stroke.color) {
        const hexColor = rgbToHex(stroke.color.r * 255, stroke.color.g * 255, stroke.color.b * 255);
        colors.push(hexColor);
      }
    }
  }

  // Check each color against design system
  for (const color of colors) {
    result.colors.total++;
    
    const isCompliant = designSystemColors.some(dsColor => 
      isSimilarColor(color, dsColor)
    );

    if (isCompliant) {
      result.colors.compliant++;
    } else {
      result.colors.violations.push({
        nodeId: node.id,
        nodeName: node.name,
        issue: 'Color not in design system',
        currentValue: color,
        expectedValue: 'Design system color'
      });
    }
  }
}

function analyzeFonts(node: SceneNode, designSystemFonts: any[], result: AnalysisResult) {
  if (node.type !== 'TEXT') return;

  const textNode = node as TextNode;
  const textStyles = extractTextStyles(textNode);

  for (const style of textStyles) {
    result.fonts.total++;

    const isCompliant = designSystemFonts.some(dsFont => {
      return dsFont.family === style.fontFamily && 
             dsFont.weights.includes(style.fontWeight);
    });

    if (isCompliant) {
      result.fonts.compliant++;
    } else {
      result.fonts.violations.push({
        nodeId: node.id,
        nodeName: node.name,
        issue: 'Font not in design system',
        currentValue: `${style.fontFamily} ${style.fontWeight}`,
        expectedValue: 'Design system font'
      });
    }
  }
}

function analyzeShadows(node: SceneNode, designSystemShadows: any[], result: AnalysisResult) {
  if (!('effects' in node) || !node.effects) return;

  const shadows = extractEffects(node);

  for (const shadow of shadows) {
    result.shadows.total++;

    const isCompliant = designSystemShadows.some(dsShadow => {
      return Math.abs(dsShadow.blur - shadow.blur) <= 1 &&
             Math.abs(dsShadow.offsetX - shadow.offsetX) <= 1 &&
             Math.abs(dsShadow.offsetY - shadow.offsetY) <= 1 &&
             isSimilarColor(shadow.color, dsShadow.color);
    });

    if (isCompliant) {
      result.shadows.compliant++;
    } else {
      result.shadows.violations.push({
        nodeId: node.id,
        nodeName: node.name,
        issue: 'Shadow not in design system',
        currentValue: `blur: ${shadow.blur}, offset: ${shadow.offsetX},${shadow.offsetY}`,
        expectedValue: 'Design system shadow'
      });
    }
  }
}

function analyzeComponents(node: SceneNode, componentPrefixes: string[], result: AnalysisResult) {
  // Only analyze actual components and instances
  if (node.type !== 'COMPONENT' && node.type !== 'INSTANCE') return;

  result.components.total++;

  // Check if it's a design system component
  const isDesignSystemComponent = componentPrefixes.some(prefix => 
    node.name.startsWith(prefix)
  );

  if (isDesignSystemComponent) {
    result.components.compliant++;
  } else {
    result.components.violations.push({
      nodeId: node.id,
      nodeName: node.name,
      issue: node.type === 'INSTANCE' ? 'Instance not from design system' : 'Component not following design system naming',
      currentValue: node.name,
      expectedValue: `Component with prefix: ${componentPrefixes.join(', ')}`
    });
  }
}
