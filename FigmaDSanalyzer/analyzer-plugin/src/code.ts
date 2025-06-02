/// <reference types="@figma/plugin-typings" />
import { AnalysisResult, ComplianceReport, DesignSystemConfig, ComponentData, StylesData } from './types';
import { analyzeNode } from './analyzer';
import { loadDataFiles } from './dataLoader';

// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600 });

// Store design system data
let componentsData: ComponentData[] = [];
let stylesData: StylesData[] = [];

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
      const report = await analyzeFrame(node as FrameNode);
      reports.push(report);
      
      // Cria card visual no canvas
      await createAnalysisCard(report, node as FrameNode);
      
      // Envia dados detalhados para a UI
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

async function analyzeFrame(frame: FrameNode): Promise<ComplianceReport> {
  // Analyze the frame and all its children
  const analysis = analyzeNode(frame, componentsData, stylesData, false, true);

  // Calculate coverage percentage
  const coveragePercentage = analysis.totalLayers > 0 
    ? (analysis.dsComponentsUsed / analysis.totalLayers) * 100 
    : 0;

  // Determine coverage level
  let coverageLevel: 'Muito Baixa' | 'Baixa' | 'Boa';
  if (coveragePercentage < 50) {
    coverageLevel = 'Muito Baixa';
  } else if (coveragePercentage < 70) {
    coverageLevel = 'Baixa';
  } else {
    coverageLevel = 'Boa';
  }

  return {
    frameName: frame.name,
    frameId: frame.id,
    totalLayers: analysis.totalLayers,
    dsComponentsUsed: analysis.dsComponentsUsed,
    coveragePercentage: Math.round(coveragePercentage),
    coverageLevel,
    nonCompliantItems: {
      colors: analysis.nonCompliantColors,
      fonts: analysis.nonCompliantFonts,
      effects: analysis.nonCompliantEffects,
      components: analysis.nonDsComponents
    }
  };
}

async function createAnalysisCard(report: ComplianceReport, frame: FrameNode) {
  // Carrega todas as fontes necessárias primeiro
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" })
  ]);

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
  title.characters = `Cobertura do Design System: ${report.coverageLevel}`;
  title.fontSize = 16;
  title.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];
  title.x = 16;
  title.y = 16;
  title.fontName = { family: "Inter", style: "Medium" };
  card.appendChild(title);
  
  // Informações de camadas
  const layersInfo = figma.createText();
  layersInfo.characters = `Total de Camadas: ${report.totalLayers}\nComponentes DS: ${report.dsComponentsUsed}`;
  layersInfo.fontSize = 12;
  layersInfo.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  layersInfo.x = 16;
  layersInfo.y = 50;
  layersInfo.fontName = { family: "Inter", style: "Regular" };
  card.appendChild(layersInfo);
    
    // Barra de progresso
    const progressBg = figma.createRectangle();
    progressBg.x = 16;
  progressBg.y = 90;
    progressBg.resize(cardWidth - 32, 6);
    progressBg.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
    progressBg.cornerRadius = 3;
    card.appendChild(progressBg);
    
    const progressFill = figma.createRectangle();
    progressFill.x = 16;
  progressFill.y = 90;
  progressFill.resize((cardWidth - 32) * (report.coveragePercentage / 100), 6);
    progressFill.cornerRadius = 3;
    
  // Cor baseada no nível de cobertura
  let color = { r: 0.85, g: 0.2, b: 0.2 }; // Vermelho para "Muito Baixa"
  if (report.coverageLevel === 'Boa') {
    color = { r: 0.2, g: 0.7, b: 0.3 }; // Verde
  } else if (report.coverageLevel === 'Baixa') {
    color = { r: 1, g: 0.7, b: 0.2 }; // Amarelo
  }
    
    progressFill.fills = [{ type: 'SOLID', color }];
    card.appendChild(progressFill);
    
  // Itens fora do DS
  const nonCompliantTitle = figma.createText();
  nonCompliantTitle.characters = 'Itens fora do Design System:';
  nonCompliantTitle.fontSize = 12;
  nonCompliantTitle.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  nonCompliantTitle.x = 16;
  nonCompliantTitle.y = 110;
  nonCompliantTitle.fontName = { family: "Inter", style: "Regular" };
  card.appendChild(nonCompliantTitle);
  
  const nonCompliantItems = figma.createText();
  nonCompliantItems.characters = `Cores: ${report.nonCompliantItems.colors}\nFontes: ${report.nonCompliantItems.fonts}\nEfeitos: ${report.nonCompliantItems.effects}\nComponentes: ${report.nonCompliantItems.components}`;
  nonCompliantItems.fontSize = 12;
  nonCompliantItems.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  nonCompliantItems.x = 16;
  nonCompliantItems.y = 130;
  nonCompliantItems.fontName = { family: "Inter", style: "Regular" };
  card.appendChild(nonCompliantItems);
  
  // Adiciona o card à página
  figma.currentPage.appendChild(card);
  
  // Seleciona o card para destacá-lo
  figma.currentPage.selection = [...figma.currentPage.selection, card];
}

// Initialize the plugin
figma.ui.postMessage({ type: 'plugin-initialized' });
loadDesignSystemData();
