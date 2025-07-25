/// <reference types="@figma/plugin-typings" />
import { AnalysisResult, ComplianceReport, ComponentData, StylesData } from './types';
import { analyzeFrame } from './analyzer';
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
      // Log das métricas principais
      console.log(`[MÉTRICAS] Frame: ${node.name} | Camadas: ${report.totalLayers} | DS Components: ${report.dsComponentsUsed} | Cobertura: ${report.coveragePercentage}% (${report.coverageLevel.label})`);
    }
  }

  figma.ui.postMessage({
    type: 'analysis-complete',
    reports
  });
}

async function createAnalysisCard(report: ComplianceReport, frame: FrameNode) {
  // Carrega todas as fontes necessárias
  await Promise.all([
    figma.loadFontAsync({ family: "Inter", style: "Regular" }),
    figma.loadFontAsync({ family: "Inter", style: "Medium" }),
    figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Bold" }),
    figma.loadFontAsync({ family: "Inter", style: "Black" }),
    figma.loadFontAsync({ family: "Roboto", style: "Regular" })
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
  titleContainer.resize(432, 32);
  titleContainer.cornerRadius = 8;
  titleContainer.primaryAxisAlignItems = "SPACE_BETWEEN";
  titleContainer.counterAxisAlignItems = "CENTER";
  titleContainer.fills = [];

  // Título à esquerda
  const titleText = figma.createText();
  titleText.characters = "Prisma DS Compliance";
  titleText.fontSize = 24;
  titleText.fontName = { family: "Inter", style: "Semi Bold" };
  titleText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

  // Tag de versão à direita
  const versionTagFrame = figma.createFrame();
  versionTagFrame.name = "VersionTag";
  versionTagFrame.layoutMode = "HORIZONTAL";
  versionTagFrame.primaryAxisSizingMode = "AUTO";
  versionTagFrame.counterAxisSizingMode = "AUTO";
  versionTagFrame.paddingLeft = 4;
  versionTagFrame.paddingRight = 4;
  versionTagFrame.paddingTop = 2;
  versionTagFrame.paddingBottom = 2;
  versionTagFrame.cornerRadius = 6;
  versionTagFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.76, b: 0.89 } }];
  versionTagFrame.opacity = 0.8;

  const versionTag = figma.createText();
  versionTag.characters = "alpha.2";
  versionTag.fontSize = 12;
  versionTag.fontName = { family: "Inter", style: "Bold" };
  versionTag.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.2, b: 0.6 } }];
  versionTag.textAlignHorizontal = "CENTER";
  versionTag.textAlignVertical = "CENTER";

  versionTagFrame.appendChild(versionTag);

  // Adiciona título e tag diretamente ao container
  titleContainer.appendChild(titleText);
  titleContainer.appendChild(versionTagFrame);

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

  // Emoji simples para o card no canvas
  let simpleEmoji = '';
  switch (report.coverageLevel.label) {
    case 'Muito baixa':
      simpleEmoji = '✗';
      break;
    case 'Baixa':
      simpleEmoji = '⚠';
      break;
    case 'Boa':
      simpleEmoji = '✓';
      break;
    case 'Ótima':
      simpleEmoji = '★';
      break;
    default:
      simpleEmoji = '?';
  }
  const emojiText = figma.createText();
  emojiText.characters = simpleEmoji;
  emojiText.fontSize = 24;
  emojiText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

  // Texto
  const messageText = figma.createText();
  messageText.characters = report.coverageLevel.label;
  messageText.fontSize = 24;
  messageText.fontName = { family: "Inter", style: "Bold" };
  messageText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

  // Container horizontal para emoji + texto
  const messageContainer = figma.createFrame();
  messageContainer.layoutMode = "HORIZONTAL";
  messageContainer.counterAxisAlignItems = "CENTER";
  messageContainer.primaryAxisAlignItems = "CENTER";
  messageContainer.fills = [];
  messageContainer.itemSpacing = 8;
  messageContainer.appendChild(emojiText);
  messageContainer.appendChild(messageText);

  // Texto da porcentagem
  const percentageText = figma.createText();
  percentageText.characters = `${report.coveragePercentage}%`;
  percentageText.fontSize = 24;
  percentageText.fontName = { family: "Inter", style: "Bold" };
  percentageText.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

  textContainer.appendChild(messageContainer);
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
  gradientRect.resize(864, 43);
  gradientRect.cornerRadius = 0;
  gradientRect.fills = [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [-1, 0, 1], // 270deg
      [0, 1, 0]
    ],
    gradientStops: [
      { position: 0.0003, color: { r: 0.502, g: 0.82, b: 0.188, a: 1 } },    // #80D130
      { position: 0.4, color: { r: 0.82, g: 0.82, b: 0.188, a: 1 } },        // #D1D130
      { position: 0.6997, color: { r: 1, g: 0.624, b: 0.039, a: 1 } },       // #FF9F0A
      { position: 0.9991, color: { r: 1, g: 0.2, b: 0, a: 1 } }              // #F30
    ]
  }];
  // Posiciona o gradiente conforme a cobertura
  const gradientX = -432 * (report.coveragePercentage / 100);
  gradientRect.x = gradientX;

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
  componentsLabel.characters = "Elementos do DS:";
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
