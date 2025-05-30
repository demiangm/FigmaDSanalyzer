import { AnalysisResult, DesignSystemConfig, ViolationInfo, AnalysisMetric } from './types';

export function analyzeNode(
  node: SceneNode,
  designSystem: DesignSystemConfig,
  skipComponentAnalysis: boolean = false
): AnalysisResult {
  const analysis: AnalysisResult = {
    colors: { compliant: 0, total: 0, violations: [] },
    fonts: { compliant: 0, total: 0, violations: [] },
    shadows: { compliant: 0, total: 0, violations: [] },
    components: { compliant: 0, total: 0, violations: [] }
  };

  // Analyze colors
  if ('fills' in node) {
    analyzePaintStyles(node as DefaultShapeMixin, designSystem.styles.colors, analysis.colors, 'fill');
  }
  if ('strokes' in node) {
    analyzePaintStyles(node as DefaultShapeMixin, designSystem.styles.colors, analysis.colors, 'stroke');
  }

  // Analyze text styles
  if (node.type === 'TEXT') {
    analyzeTextStyles(node, designSystem.styles.text, analysis.fonts);
  }

  // Analyze effect styles
  if ('effects' in node) {
    analyzeEffectStyles(node as DefaultShapeMixin, designSystem.styles.effects, analysis.shadows);
  }

  // Analyze components
  if (!skipComponentAnalysis && node.type === 'INSTANCE') {
    analyzeComponent(node, designSystem.components, analysis.components);
  }

  return analysis;
}

function analyzePaintStyles(
  node: DefaultShapeMixin,
  designSystemColors: Record<string, string>,
  analysis: AnalysisMetric,
  type: 'fill' | 'stroke'
) {
  const styles = type === 'fill' ? node.fills : node.strokes;
  if (!styles || typeof styles === 'symbol') return;

  const paints = styles as Paint[];
  paints.forEach((style) => {
    if (style.type === 'SOLID') {
      analysis.total++;
      
      const styleId = type === 'fill' ? node.fillStyleId : node.strokeStyleId;
      
      if (styleId && typeof styleId !== 'symbol' && Object.values(designSystemColors).includes(styleId)) {
        analysis.compliant++;
      } else {
        const violation: ViolationInfo = {
          nodeId: node.id,
          nodeName: node.name,
          issue: `Non-compliant ${type} color`,
          currentValue: typeof styleId !== 'symbol' ? styleId : 'No style',
          expectedValue: 'Design System Color Style'
        };
        analysis.violations.push(violation);
      }
    }
  });
}

function analyzeTextStyles(
  node: TextNode,
  designSystemTextStyles: Record<string, string>,
  analysis: AnalysisMetric
) {
  analysis.total++;
  
  if (node.textStyleId && typeof node.textStyleId !== 'symbol' && 
      Object.values(designSystemTextStyles).includes(node.textStyleId)) {
    analysis.compliant++;
  } else {
    const violation: ViolationInfo = {
      nodeId: node.id,
      nodeName: node.name,
      issue: 'Non-compliant text style',
      currentValue: typeof node.textStyleId !== 'symbol' ? node.textStyleId : 'No style',
      expectedValue: 'Design System Text Style'
    };
    analysis.violations.push(violation);
  }
}

function analyzeEffectStyles(
  node: DefaultShapeMixin,
  designSystemEffects: Record<string, string>,
  analysis: AnalysisMetric
) {
  if (!node.effects || typeof node.effects === 'symbol') return;

  const effects = node.effects as Effect[];
  effects.forEach(() => {
    analysis.total++;
    
    if (node.effectStyleId && 
        typeof node.effectStyleId !== 'symbol' && 
        Object.values(designSystemEffects).includes(node.effectStyleId)) {
      analysis.compliant++;
    } else {
      const violation: ViolationInfo = {
        nodeId: node.id,
        nodeName: node.name,
        issue: 'Non-compliant effect style',
        currentValue: typeof node.effectStyleId !== 'symbol' ? node.effectStyleId : 'No style',
        expectedValue: 'Design System Effect Style'
      };
      analysis.violations.push(violation);
    }
  });
}

function analyzeComponent(
  node: InstanceNode,
  designSystemComponents: Record<string, string>,
  analysis: AnalysisMetric
) {
  analysis.total++;

  if (node.mainComponent && 
      Object.values(designSystemComponents).includes(node.mainComponent.id)) {
    analysis.compliant++;
  } else {
    const violation: ViolationInfo = {
      nodeId: node.id,
      nodeName: node.name,
      issue: 'Non-compliant component instance',
      currentValue: node.mainComponent?.id || 'No main component',
      expectedValue: 'Design System Component'
    };
    analysis.violations.push(violation);
  }
}