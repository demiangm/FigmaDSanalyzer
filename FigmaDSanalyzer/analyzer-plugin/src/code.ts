// Main plugin code that runs in Figma's sandbox
import { AnalysisResult, ComplianceReport, DesignSystemConfig } from './types';
import { analyzeNode } from './analyzer';
import { getDefaultDesignSystem } from './designSystem';
import { jsonDataFiles, DesignSystemFile } from './imports';

// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600 });

// Store design system configuration
let designSystemConfig: DesignSystemConfig = getDefaultDesignSystem();

// Load design system data from imported JSON files
const designSystemData = {
  components: {},
  styles: {
    colors: {},
    text: {},
    effects: {}
  }
};

// Process imported JSON files
jsonDataFiles.forEach((file: DesignSystemFile) => {
  if (file.type === 'components') {
    Object.assign(designSystemData.components, file.data.components);
  } else if (file.type === 'styles') {
    if (file.data.colorStyles) {
      Object.assign(designSystemData.styles.colors, file.data.colorStyles);
    }
    if (file.data.textStyles) {
      Object.assign(designSystemData.styles.text, file.data.textStyles);
    }
    if (file.data.effectStyles) {
      Object.assign(designSystemData.styles.effects, file.data.effectStyles);
    }
  }
});

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'analyze-selection':
      await analyzeSelection();
      break;
    
    case 'update-design-system':
      designSystemConfig = msg.config;
      await figma.clientStorage.setAsync('designSystemConfig', designSystemConfig);
      break;
    
    case 'get-design-system':
      const savedConfig = await figma.clientStorage.getAsync('designSystemConfig');
      if (savedConfig) {
        designSystemConfig = savedConfig;
      }
      figma.ui.postMessage({
        type: 'design-system-loaded',
        config: designSystemConfig,
        data: designSystemData
      });
      break;
    
    case 'generate-config-files':
      await generateConfigurationFiles();
      break;
    
    case 'close-plugin':
      figma.closePlugin();
      break;
  }
};

async function analyzeSelection() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'analysis-error',
      message: 'Please select at least one frame to analyze.'
    });
    return;
  }

  const reports: ComplianceReport[] = [];
  
  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const report = await analyzeFrame(node as FrameNode);
      reports.push(report);
    }
  }

  figma.ui.postMessage({
    type: 'analysis-complete',
    reports
  });
}

async function analyzeFrame(frame: FrameNode): Promise<ComplianceReport> {
  const analysis: AnalysisResult = {
    colors: { compliant: 0, total: 0, violations: [] },
    fonts: { compliant: 0, total: 0, violations: [] },
    shadows: { compliant: 0, total: 0, violations: [] },
    components: { compliant: 0, total: 0, violations: [] }
  };

  // Recursively analyze all child nodes
  await analyzeNodeRecursively(frame, analysis);

  // Calculate compliance percentages
  const colorCompliance = analysis.colors.total > 0 ? (analysis.colors.compliant / analysis.colors.total) * 100 : 100;
  const fontCompliance = analysis.fonts.total > 0 ? (analysis.fonts.compliant / analysis.fonts.total) * 100 : 100;
  const shadowCompliance = analysis.shadows.total > 0 ? (analysis.shadows.compliant / analysis.shadows.total) * 100 : 100;
  const componentCompliance = analysis.components.total > 0 ? (analysis.components.compliant / analysis.components.total) * 100 : 100;

  const overallCompliance = (colorCompliance + fontCompliance + shadowCompliance + componentCompliance) / 4;

  return {
    frameName: frame.name,
    frameId: frame.id,
    overallCompliance: Math.round(overallCompliance),
    colorCompliance: Math.round(colorCompliance),
    fontCompliance: Math.round(fontCompliance),
    shadowCompliance: Math.round(shadowCompliance),
    componentCompliance: Math.round(componentCompliance),
    analysis
  };
}

async function analyzeNodeRecursively(node: SceneNode, analysis: AnalysisResult) {
  // Skip sections, vectors, and groups for component analysis as requested
  const skipComponentAnalysis = ['SECTION', 'VECTOR', 'GROUP'].includes(node.type);
  
  // Analyze current node using imported design system data
  const nodeAnalysis = analyzeNode(node, {
    ...designSystemConfig,
    components: designSystemData.components,
    styles: designSystemData.styles
  }, skipComponentAnalysis);
  
  // Aggregate results
  analysis.colors.compliant += nodeAnalysis.colors.compliant;
  analysis.colors.total += nodeAnalysis.colors.total;
  analysis.colors.violations.push(...nodeAnalysis.colors.violations);
  
  analysis.fonts.compliant += nodeAnalysis.fonts.compliant;
  analysis.fonts.total += nodeAnalysis.fonts.total;
  analysis.fonts.violations.push(...nodeAnalysis.fonts.violations);
  
  analysis.shadows.compliant += nodeAnalysis.shadows.compliant;
  analysis.shadows.total += nodeAnalysis.shadows.total;
  analysis.shadows.violations.push(...nodeAnalysis.shadows.violations);
  
  analysis.components.compliant += nodeAnalysis.components.compliant;
  analysis.components.total += nodeAnalysis.components.total;
  analysis.components.violations.push(...nodeAnalysis.components.violations);

  // Recursively analyze children
  if ('children' in node && node.children) {
    for (const child of node.children) {
      await analyzeNodeRecursively(child, analysis);
    }
  }

  // Special handling for local instances - analyze their internal structure
  if (node.type === 'INSTANCE') {
    const instanceAnalysis: AnalysisResult = {
      colors: { compliant: 0, total: 0, violations: [] },
      fonts: { compliant: 0, total: 0, violations: [] },
      shadows: { compliant: 0, total: 0, violations: [] },
      components: { compliant: 0, total: 0, violations: [] }
    };
    
    if ('children' in node && node.children) {
      for (const child of node.children) {
        await analyzeNodeRecursively(child, instanceAnalysis);
      }
    }
    
    if (instanceAnalysis.colors.violations.length > 0) {
      analysis.colors.violations.push({
        nodeId: node.id,
        nodeName: node.name,
        issue: `Local instance contains ${instanceAnalysis.colors.violations.length} color violations`,
        currentValue: 'Local Instance',
        expectedValue: 'Design System Component'
      });
    }
  }
}

async function generateConfigurationFiles() {
  try {
    const components: Record<string, { key: string }> = {};
    const colorStyles: Record<string, string> = {};
    const textStyles: Record<string, string> = {};
    const effectStyles: Record<string, string> = {};

    // Extract main components from current page
    const mainComponents = figma.currentPage.findAll(node => node.type === 'COMPONENT');
    mainComponents.forEach(component => {
      const comp = component as ComponentNode;
      components[comp.name] = {
        key: comp.id
      };
    });

    // Extract local styles
    figma.getLocalPaintStyles().forEach(style => {
      colorStyles[style.name] = style.id;
    });

    figma.getLocalTextStyles().forEach(style => {
      textStyles[style.name] = style.id;
    });

    figma.getLocalEffectStyles().forEach(style => {
      effectStyles[style.name] = style.id;
    });

    const timestamp = new Date().toISOString();
    const fileName = figma.root.name;

    // Create component and style files
    const componentsFile = {
      metadata: {
        extractedAt: timestamp,
        fileName: fileName
      },
      components
    };

    const stylesFile = {
      metadata: {
        extractedAt: timestamp,
        fileName: fileName
      },
      colorStyles,
      textStyles,
      effectStyles
    };

    figma.ui.postMessage({
      type: 'config-files-generated',
      componentsFile,
      stylesFile
    });

  } catch (error: any) {
    figma.ui.postMessage({
      type: 'config-generation-error',
      message: 'Error generating configuration files: ' + error.message
    });
  }
}

// Initialize the plugin
figma.ui.postMessage({ 
  type: 'plugin-initialized',
  designSystemData
});