/// <reference types="@figma/plugin-typings" />
import { AnalysisResult, ComplianceReport, ComponentData, StylesData } from './types';
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

  // Calculate coverage percentage - exclude hidden components from the calculation
  const coveragePercentage = analysis.totalLayers > 0 
    ? ((analysis.dsComponentsUsed) / analysis.totalLayers) * 100 
    : 0;

  // Determinar o nível de cobertura
  let coverageLevel = '';
  if (coveragePercentage > 90) {
    coverageLevel = '🎉 Ótima';
  } else if (coveragePercentage > 70) {
    coverageLevel = '✅ Boa';
  } else if (coveragePercentage > 50) {
    coverageLevel = '🚩️ Baixa';
  } else {
    coverageLevel = '🚧 Muito baixa';
  }

  return {
    frameName: frame.name,
    frameId: frame.id,
    totalLayers: analysis.totalLayers,
    dsComponentsUsed: analysis.dsComponentsUsed,
    hiddenComponentsUsed: analysis.hiddenComponentsUsed,
    coveragePercentage: Math.round(coveragePercentage),
    coverageLevel: coverageLevel as "🎉 Ótima" | "✅ Boa" | "🚩️ Baixa" | "🚧 Muito baixa",
    nonCompliantItems: {
      colors: analysis.nonCompliantColors,
      fonts: analysis.nonCompliantFonts,
      effects: analysis.nonCompliantEffects,
      components: analysis.nonDsComponents
    }
  };
}

async function createAnalysisCard(report: ComplianceReport, frame: FrameNode) {
  // Carrega todas as fontes necessárias
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Black" })
  ]);

  // Cria o frame principal do card
  const card = figma.createFrame();
  card.name = `Analysis: ${frame.name}`;
  card.x = frame.x + frame.width + 50;
  card.y = frame.y;
  card.resize(480, 471);
  card.fills = [{
    type: 'SOLID',
    color: { r: 1, g: 1, b: 1 }
  }];
  card.strokes = [{
    type: 'SOLID',
    color: { r: 0.894, g: 0.894, b: 0.894 } // #e4e4e4
  }];
  card.strokeWeight = 2;
  card.cornerRadius = 24;
  card.layoutMode = "VERTICAL";
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "FIXED";
  card.paddingTop = 24;
  card.paddingRight = 24;
  card.paddingBottom = 24;
  card.paddingLeft = 24;
  card.itemSpacing = 16;
  
  // Título
  const titleContainer = figma.createFrame();
  titleContainer.name = "Title";
  titleContainer.layoutMode = "HORIZONTAL";
  titleContainer.primaryAxisSizingMode = "FIXED";
  titleContainer.counterAxisSizingMode = "AUTO";
  titleContainer.itemSpacing = 8;
  titleContainer.resize(432, 32);
  titleContainer.cornerRadius = 8;

  const titleTextContainer = figma.createFrame();
  titleTextContainer.name = "Title";
  titleTextContainer.layoutMode = "VERTICAL";
  titleTextContainer.primaryAxisSizingMode = "AUTO";
  titleTextContainer.counterAxisSizingMode = "AUTO";
  titleTextContainer.cornerRadius = 8;

  const titleText = figma.createText();
  titleText.characters = "Prisma DS Compliance";
  titleText.fontSize = 24;
  titleText.fontName = { family: "Inter", style: "Semi Bold" };
  titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  titleText.lineHeight = { unit: 'PIXELS', value: 32 };

  titleTextContainer.appendChild(titleText);
  titleContainer.appendChild(titleTextContainer);

  // Container do gráfico
  const gaugeContainer = figma.createFrame();
  gaugeContainer.name = "Gauge";
  gaugeContainer.layoutMode = "VERTICAL";
  gaugeContainer.primaryAxisSizingMode = "AUTO";
  gaugeContainer.counterAxisSizingMode = "FIXED";
  gaugeContainer.itemSpacing = 16;
  gaugeContainer.resize(432, 100);

  // Container do semicírculo e texto
  const chartContainer = figma.createFrame();
  chartContainer.name = "SemicircleChart";
  chartContainer.layoutMode = "VERTICAL";
  chartContainer.primaryAxisSizingMode = "AUTO";
  chartContainer.counterAxisSizingMode = "FIXED";
  chartContainer.itemSpacing = 8;
  chartContainer.resize(432, 100);

  // Container do texto superior
  const textContainer = figma.createFrame();
  textContainer.name = "Text";
  textContainer.layoutMode = "HORIZONTAL";
  textContainer.primaryAxisSizingMode = "FIXED";
  textContainer.counterAxisSizingMode = "AUTO";
  textContainer.primaryAxisAlignItems = "SPACE_BETWEEN";
  textContainer.counterAxisAlignItems = "CENTER";
  textContainer.resize(432, 40);

  // Mensagem de status
  const messageText = figma.createText();
  messageText.characters = report.coverageLevel;  // Já inclui o emoji
  messageText.fontSize = 24;
  messageText.fontName = { family: "Inter", style: "Bold" };
  messageText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

  // Texto da porcentagem
  const percentageText = figma.createText();
  percentageText.characters = `${report.coveragePercentage}%`;
  percentageText.fontSize = 24;
  percentageText.fontName = { family: "Inter", style: "Bold" };
  percentageText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

  textContainer.appendChild(messageText);
  textContainer.appendChild(percentageText);

  // Container do gráfico
  const graphContainer = figma.createFrame();
  graphContainer.name = "Graph";
  graphContainer.layoutMode = "HORIZONTAL";
  graphContainer.primaryAxisSizingMode = "FIXED";
  graphContainer.counterAxisSizingMode = "FIXED";
  graphContainer.cornerRadius = 16;
  graphContainer.resize(432, 43);
  graphContainer.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }]; // #D9D9D9

  // Barra de progresso com gradiente
  const progressBar = figma.createFrame();
  progressBar.name = "Data";
  progressBar.resize(Math.round((432 * report.coveragePercentage) / 100), 43);
  progressBar.cornerRadius = 0;

  // Retângulo com gradiente
  const gradientRect = figma.createRectangle();
  gradientRect.resize(432, 43);
  gradientRect.cornerRadius = 0;
  gradientRect.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [-1, 0, 1], // 270deg
      [0, 1, 0]
    ],
    gradientStops: [
      { position: 0.0003, color: { r: 0.502, g: 0.82, b: 0.188, a: 1 } },    // #80D130
      { position: 0.4988, color: { r: 1, g: 0.624, b: 0.039, a: 1 } },       // #FF9F0A
      { position: 0.9991, color: { r: 1, g: 0.2, b: 0, a: 1 } }              // #F30
    ]
  }];

  progressBar.appendChild(gradientRect);
  progressBar.clipsContent = true;
  graphContainer.appendChild(progressBar);

  chartContainer.appendChild(textContainer);
  chartContainer.appendChild(graphContainer);

  // Container de dados inferiores
  const bottomDataContainer = figma.createFrame();
  bottomDataContainer.name = "Data";
  bottomDataContainer.layoutMode = "HORIZONTAL";
  bottomDataContainer.primaryAxisSizingMode = "FIXED";
  bottomDataContainer.counterAxisSizingMode = "AUTO";
  bottomDataContainer.primaryAxisAlignItems = "SPACE_BETWEEN";
  bottomDataContainer.resize(432, 40);

  // Container de camadas
  const layersContainer = figma.createFrame();
  layersContainer.name = "Layers";
  layersContainer.layoutMode = "VERTICAL";
  layersContainer.primaryAxisSizingMode = "AUTO";
  layersContainer.counterAxisSizingMode = "FIXED";
  layersContainer.resize(132, 40);

  const layersLabel = figma.createText();
  layersLabel.characters = "Total de Camadas:";
  layersLabel.fontSize = 14;
  layersLabel.fontName = { family: "Inter", style: "Medium" };
  layersLabel.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.4 }];
  layersLabel.lineHeight = { unit: 'PIXELS', value: 20 };

  const layersNumber = figma.createText();
  layersNumber.characters = report.totalLayers.toString();
  layersNumber.fontSize = 17;
  layersNumber.fontName = { family: "Inter", style: "Bold" };
  layersNumber.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  layersNumber.lineHeight = { unit: 'PIXELS', value: 20 };

  layersContainer.appendChild(layersLabel);
  layersContainer.appendChild(layersNumber);

  // Container de componentes
  const componentsContainer = figma.createFrame();
  componentsContainer.name = "Components";
  componentsContainer.layoutMode = "VERTICAL";
  componentsContainer.primaryAxisSizingMode = "AUTO";
  componentsContainer.counterAxisSizingMode = "AUTO";
  componentsContainer.primaryAxisAlignItems = "SPACE_BETWEEN";
  componentsContainer.counterAxisAlignItems = "MAX";

  const componentsLabel = figma.createText();
  componentsLabel.characters = "Componentes do Prisma:";
  componentsLabel.fontSize = 14;
  componentsLabel.fontName = { family: "Inter", style: "Medium" };
  componentsLabel.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.4 }];
  componentsLabel.textAlignHorizontal = "RIGHT";

  const componentsNumber = figma.createText();
  componentsNumber.characters = report.dsComponentsUsed.toString();
  componentsNumber.fontSize = 17;
  componentsNumber.fontName = { family: "Inter", style: "Bold" };
  componentsNumber.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  componentsNumber.textAlignHorizontal = "RIGHT";

  componentsContainer.appendChild(componentsLabel);
  componentsContainer.appendChild(componentsNumber);

  bottomDataContainer.appendChild(layersContainer);
  bottomDataContainer.appendChild(componentsContainer);

  // Container de itens fora do DS
  const outOfDSContainer = figma.createFrame();
  outOfDSContainer.name = "OutofDS";
  outOfDSContainer.layoutMode = "VERTICAL";
  outOfDSContainer.primaryAxisSizingMode = "AUTO";
  outOfDSContainer.counterAxisSizingMode = "FIXED";
  outOfDSContainer.itemSpacing = 8;
  outOfDSContainer.paddingTop = 8;
  outOfDSContainer.paddingRight = 16;
  outOfDSContainer.paddingBottom = 16;
  outOfDSContainer.paddingLeft = 16;
  outOfDSContainer.cornerRadius = 8;
  outOfDSContainer.resize(432, 100);
  outOfDSContainer.fills = [
    {
      type: 'SOLID',
      color: { r: 1, g: 0.231, b: 0.188 },
      opacity: 0.23
    },
    {
      type: 'GRADIENT_LINEAR',
      gradientTransform: [
        [0, 1, 0],
        [0, -1, 1]
      ],
      gradientStops: [
        { position: 0, color: { r: 1, g: 1, b: 1, a: 0.05 } },
        { position: 1, color: { r: 1, g: 1, b: 1, a: 0.4 } }
      ]
    }
  ];

  // Título dos itens fora do DS
  const outOfDSTitle = figma.createText();
  outOfDSTitle.characters = "Itens fora do Prisma DS:";
  outOfDSTitle.fontSize = 20;
  outOfDSTitle.fontName = { family: "Inter", style: "Semi Bold" };
  outOfDSTitle.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
  outOfDSTitle.lineHeight = { unit: 'PIXELS', value: 32 };

  // Container de dados fora do DS
  const outOfDSData = figma.createFrame();
  outOfDSData.name = "Data";
  outOfDSData.layoutMode = "HORIZONTAL";
  outOfDSData.primaryAxisSizingMode = "AUTO";
  outOfDSData.counterAxisSizingMode = "AUTO";
  outOfDSData.itemSpacing = 24;
  outOfDSData.resize(400, 40);
  outOfDSData.fills = [];

  // Função helper para criar containers de métricas
  const createMetricContainer = (label: string, value: number, isFirst: boolean = false) => {
    const container = figma.createFrame();
    container.layoutMode = "VERTICAL";
    container.itemSpacing = 3;
    container.primaryAxisSizingMode = "AUTO";
    container.counterAxisSizingMode = "AUTO";
    container.layoutGrow = 1;
    container.fills = [];

    if (isFirst) {
      container.minWidth = 94;
    }

    const number = figma.createText();
    number.characters = value.toString();
    number.fontSize = 27;
    number.lineHeight = { unit: 'PIXELS', value: 20 };
    number.fontName = { family: "Inter", style: "Semi Bold" };
    number.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    number.textAlignHorizontal = "LEFT";

    const text = figma.createText();
    text.characters = label;
    text.fontSize = 14;
    text.fontName = { family: "Inter", style: "Medium" };
    text.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0.5 }];
    text.textAlignHorizontal = "LEFT";

    container.appendChild(number);
    container.appendChild(text);
    return container;
  };

  // Adicionar métricas
  const metrics = [
    { label: "Componentes", value: report.nonCompliantItems.components },
    { label: "Cores", value: report.nonCompliantItems.colors },
    { label: "Fontes", value: report.nonCompliantItems.fonts },
    { label: "Efeitos", value: report.nonCompliantItems.effects }
  ];

  metrics.forEach((metric, index) => {
    outOfDSData.appendChild(createMetricContainer(metric.label, metric.value, index === 0));
  });

  outOfDSContainer.appendChild(outOfDSTitle);
  outOfDSContainer.appendChild(outOfDSData);

  // Montar a hierarquia final
  gaugeContainer.appendChild(chartContainer);
  gaugeContainer.appendChild(bottomDataContainer);

  card.appendChild(titleContainer);
  card.appendChild(gaugeContainer);
  card.appendChild(outOfDSContainer);
  
  // Adiciona o card à página
  figma.currentPage.appendChild(card);
  
  // Exporta o card como PNG
  const exportSettings: ExportSettings = {
    format: 'PNG',
    constraint: { type: 'SCALE', value: 2 }
  };
  card.exportSettings = [exportSettings];

  try {
    // Exporta o card como bytes
    const bytes = await card.exportAsync(exportSettings);

    // Cria uma nova imagem com os bytes exportados
    const image = figma.createImage(bytes);

    // Cria um retângulo com a imagem
    const rect = figma.createRectangle();
    rect.name = `Analysis: ${frame.name}`;
    rect.x = card.x;
    rect.y = card.y;
    rect.resize(card.width, card.height);
    rect.fills = [{
      type: 'IMAGE',
      imageHash: image.hash,
      scaleMode: 'FILL'
    }];

    // Remove o card original
    card.remove();

    // Seleciona o novo retângulo
    figma.currentPage.selection = [rect];
  } catch (error) {
    console.error('Erro ao exportar card:', error);
    // Em caso de erro, mantém o card original
    figma.currentPage.selection = [card];
  }
}

// Initialize the plugin
figma.ui.postMessage({ type: 'plugin-initialized' });
loadDesignSystemData();
