
// Main plugin code that runs in Figma's sandbox
import { AnalysisResult, ComplianceReport, DesignSystemConfig } from './types'; // Removed './src/'
import { analyzeNode } from './analyzer';                         // Removed './src/'
import { loadDesignSystem } from './dataLoader';                  // Removed './src/'


// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600 });

// Store design system data
let componentsData: ComponentData[] = [];
let stylesData: StylesData[] = [];

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'analyze-selection':
      await analyzeSelection();
      break;
    
    case 'get-design-system':
      await loadDesignSystemData();
      break;
    
    case 'close-plugin':
      figma.closePlugin();
      break;
  }
};

async function loadDesignSystemData() {
  try {
    const data = await loadDataFiles();
    componentsData = data.components;
    stylesData = data.styles;
    
    figma.ui.postMessage({
      type: 'design-system-loaded',
      summary: {
        components: componentsData.reduce((total, data) => total + Object.keys(data.components).length, 0),
        colorStyles: stylesData.reduce((total, data) => total + Object.keys(data.colorStyles).length, 0),
        textStyles: stylesData.reduce((total, data) => total + Object.keys(data.textStyles).length, 0),
        effectStyles: stylesData.reduce((total, data) => total + Object.keys(data.effectStyles).length, 0)
      }
    });
  } catch (error) {
    figma.ui.postMessage({
      type: 'analysis-error',
      message: 'Erro ao carregar dados do Design System: ' + (error as Error).message
    });
  }
}

async function analyzeSelection() {
  const selection = figma.currentPage.selection;
  
  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'analysis-error',
      message: 'Selecione pelo menos um frame para analisar.'
    });
    return;
  }

  // Carrega dados se ainda não foram carregados
  if (componentsData.length === 0 || stylesData.length === 0) {
    await loadDesignSystemData();
  }

  const reports: ComplianceReport[] = [];
  
  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const report = await analyzeFrame(node as FrameNode);
      reports.push(report);
      
      // Cria card visual no canvas
      await createAnalysisCard(report, node as FrameNode);
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
  
  // Analyze current node
  const nodeAnalysis = analyzeNode(node, componentsData, stylesData, skipComponentAnalysis);
  
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
    const instance = node as InstanceNode;
    const mainComponent = instance.mainComponent;
    
    // Se for um componente local ou de outra biblioteca, analisa internamente
    if (mainComponent && !componentsData.some(data => 
      Object.values(data.components).some(comp => comp.key === mainComponent.key)
    )) {
      // Analisa os filhos da instância local
      if ('children' in node && node.children) {
        for (const child of node.children) {
          await analyzeNodeRecursively(child, analysis);
        }
      }
    }
  }
}

async function createAnalysisCard(report: ComplianceReport, frame: FrameNode) {
  const cardWidth = 300;
  const cardHeight = 200;
  
  // Posiciona o card ao lado do frame
  const cardX = frame.x + frame.width + 50;
  const cardY = frame.y;
  
  // Cria o frame do card
  const card = figma.createFrame();
  card.name = `Analysis: ${frame.name}`;
  card.x = cardX;
  card.y = cardY;
  card.resize(cardWidth, cardHeight);
  card.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 }
  }];
  card.strokes = [{
    type: 'SOLID',
    color: { r: 0.9, g: 0.9, b: 0.9 }
  }];
  card.strokeWeight = 1;
  card.cornerRadius = 8;
  
  // Título
  const title = figma.createText();
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  title.characters = `DS Compliance: ${report.overallCompliance}%`;
  title.fontSize = 16;
  title.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  title.x = 16;
  title.y = 16;
  card.appendChild(title);
  
  // Métricas
  const metrics = [
    { label: 'Cores', value: report.colorCompliance, count: `${report.analysis.colors.compliant}/${report.analysis.colors.total}` },
    { label: 'Fontes', value: report.fontCompliance, count: `${report.analysis.fonts.compliant}/${report.analysis.fonts.total}` },
    { label: 'Efeitos', value: report.shadowCompliance, count: `${report.analysis.shadows.compliant}/${report.analysis.shadows.total}` },
    { label: 'Componentes', value: report.componentCompliance, count: `${report.analysis.components.compliant}/${report.analysis.components.total}` }
  ];
  
  let yOffset = 50;
  
  for (const metric of metrics) {
    // Label
    const label = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    label.characters = `${metric.label}: ${metric.value}% (${metric.count})`;
    label.fontSize = 12;
    label.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    label.x = 16;
    label.y = yOffset;
    card.appendChild(label);
    
    // Barra de progresso
    const progressBg = figma.createRectangle();
    progressBg.x = 16;
    progressBg.y = yOffset + 20;
    progressBg.resize(cardWidth - 32, 6);
    progressBg.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
    progressBg.cornerRadius = 3;
    card.appendChild(progressBg);
    
    const progressFill = figma.createRectangle();
    progressFill.x = 16;
    progressFill.y = yOffset + 20;
    progressFill.resize((cardWidth - 32) * (metric.value / 100), 6);
    progressFill.cornerRadius = 3;
    
    // Cor baseada na porcentagem
    let color = { r: 0.85, g: 0.2, b: 0.2 }; // Vermelho
    if (metric.value >= 90) color = { r: 0.2, g: 0.7, b: 0.3 }; // Verde
    else if (metric.value >= 70) color = { r: 1, g: 0.7, b: 0.2 }; // Amarelo
    
    progressFill.fills = [{ type: 'SOLID', color }];
    card.appendChild(progressFill);
    
    yOffset += 40;
  }
  
  // Adiciona o card à página
  figma.currentPage.appendChild(card);
  
  // Seleciona o card para destacá-lo
  figma.currentPage.selection = [...figma.currentPage.selection, card];
}

// Initialize the plugin
figma.ui.postMessage({ type: 'plugin-initialized' });
loadDesignSystemData();
