/// <reference types="@figma/plugin-typings" />
import { AnalysisResult, ComplianceReport, ComponentData, StylesData } from './types';
import { analyzeNode, analyzeFrame } from './analyzer';
import { loadDataFiles } from './dataLoader';

// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600 });

// Store design system data
let componentsData: ComponentData[] = [];
let stylesData: StylesData[] = [];

// Pre-load a font to ensure emojis can be rendered in the UI.
// This is a workaround for a Figma issue where emojis might not
// appear if the font containing them hasn't been loaded into the
// Figma environment. 'Inter' is a standard Figma font.
async function prepareFonts() {
  try {
    await figma.loadFontAsync({ family: "Roboto", style: "Regular" });
  } catch (e) {
    console.error("Could not load the 'Roboto' font. Emojis might not display correctly in the UI.", e);
  }
}

prepareFonts().then(() => {
    console.log('Font pre-loaded for UI emoji support.');
});

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  try {
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
  } catch (error) {
    console.error('Erro na execução:', error);
    figma.ui.postMessage({
      type: 'analysis-error',
      message: (error as Error).message
    });
  }
};

async function loadDesignSystemData() {
  try {
    const data = await loadDataFiles();
    
    if (!data || !data.components || !data.styles) {
      throw new Error('Dados do Design System inválidos ou incompletos');
    }
    
    componentsData = data.components;
    stylesData = data.styles;
    
    if (componentsData.length === 0 || stylesData.length === 0) {
      throw new Error('Nenhum dado do Design System foi carregado');
    }
    
    figma.ui.postMessage({
      type: 'design-system-loaded',
      summary: {
        components: componentsData.reduce((total, data) => total + Object.keys(data.components || {}).length, 0),
        colorStyles: stylesData.reduce((total, data) => total + Object.keys(data.colorStyles || {}).length, 0),
        textStyles: stylesData.reduce((total, data) => total + Object.keys(data.textStyles || {}).length, 0),
        effectStyles: stylesData.reduce((total, data) => total + Object.keys(data.effectStyles || {}).length, 0)
      }
    });
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    figma.ui.postMessage({
      type: 'analysis-error',
      message: 'Erro ao carregar dados do Design System: ' + (error as Error).message
    });
    throw error; // Re-throw para interromper a execução
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
      const report = await analyzeFrame(node as FrameNode, componentsData, stylesData);
      reports.push(report);
      
      // Cria card visual no canvas
      await createAnalysisCard(report, node as FrameNode);
      
      // Envia dados detalhados para a UI
      console.log('[DEBUG] Enviando para UI:', report);
      figma.ui.postMessage({
        type: 'frame-analyzed',
        report: {
          ...report,
          details: {
            name: node.name,
            type: node.type,
            totalLayers: report.totalLayers,
            dsComponents: report.dsComponentsUsed,
            coverage: {
              percentage: report.coveragePercentage,
              level: report.coverageLevel
            },
            nonCompliant: report.nonCompliantItems
          }
        }
      });
    }
  }

  figma.ui.postMessage({
    type: 'analysis-complete',
    reports
  });
}

async function createAnalysisCard(report: ComplianceReport, frame: FrameNode) {
  const CARD_COMPONENT_KEY = "cb06a1096da85eb3e0404a3cf142e58581611800";
  const componentSet = await figma.importComponentByKeyAsync(CARD_COMPONENT_KEY);
  const cardInstance = componentSet.createInstance();

  const props: Record<string, string> = {
    "property.coverage": report.coveragePercentage.toString(),
    "property.dSComponents": report.dsComponentsUsed.toString().padStart(4, '0'),
    "property.totalLayers": report.totalLayers.toString().padStart(5, '0'),
    "property.outofDSComponents": report.nonCompliantItems.components.toString().padStart(3, '0'),
    "property.outofDSColors": report.nonCompliantItems.colors.toString().padStart(3, '0'),
    "property.outofDSFonts": report.nonCompliantItems.fonts.toString().padStart(3, '0'),
    "property.outofDSEffects": report.nonCompliantItems.effects.toString().padStart(3, '0'),
    "property.nVel": report.coverageLevel.label.toLowerCase().replace('ó', 'o').replace(' ', '-'),
  };
  for (const [prop, value] of Object.entries(props)) {
    try {
      cardInstance.setProperties({ [prop]: value });
    } catch (e) {}
  }

  // Função utilitária para buscar node por nome
  function findNodeByName(node: BaseNode, name: string): BaseNode | undefined {
    if (node.name === name) return node;
    if ("children" in node) {
      for (const child of node.children) {
        const found = findNodeByName(child, name);
        if (found) return found;
      }
    }
    return undefined;
  }

  // Atualizar o itemSpacing do gráfico
  const MAX_GRAPH_SPACING = 288;
  const spacing = Math.round((MAX_GRAPH_SPACING * (100 - report.coveragePercentage)) / 100);
  const dataFrame = findNodeByName(cardInstance, "Data") as FrameNode;
  if (dataFrame && "itemSpacing" in dataFrame) {
    dataFrame.itemSpacing = spacing;
  }

  cardInstance.x = frame.x + frame.width + 50;
  cardInstance.y = frame.y;
  figma.currentPage.appendChild(cardInstance);
  figma.currentPage.selection = [cardInstance];
}

// Initialize the plugin
figma.ui.postMessage({ type: 'plugin-initialized' });
loadDesignSystemData();
