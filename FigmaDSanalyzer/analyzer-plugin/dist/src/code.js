"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const analyzer_1 = require("./src/analyzer");
const designSystem_1 = require("./src/designSystem");
// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600 });
// Store design system configuration
let designSystemConfig = (0, designSystem_1.getDefaultDesignSystem)();
// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
    switch (msg.type) {
        case 'analyze-selection':
            await analyzeSelection();
            break;
        case 'update-design-system':
            designSystemConfig = msg.config;
            figma.clientStorage.setAsync('designSystemConfig', designSystemConfig);
            break;
        case 'get-design-system':
            const savedConfig = await figma.clientStorage.getAsync('designSystemConfig');
            if (savedConfig) {
                designSystemConfig = savedConfig;
            }
            figma.ui.postMessage({
                type: 'design-system-loaded',
                config: designSystemConfig
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
    const reports = [];
    for (const node of selection) {
        if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
            const report = await analyzeFrame(node);
            reports.push(report);
        }
    }
    figma.ui.postMessage({
        type: 'analysis-complete',
        reports
    });
}
async function analyzeFrame(frame) {
    const analysis = {
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
async function analyzeNodeRecursively(node, analysis) {
    // Skip sections, vectors, and groups for component analysis as requested
    const skipComponentAnalysis = ['SECTION', 'VECTOR', 'GROUP'].includes(node.type);
    // Analyze current node
    const nodeAnalysis = (0, analyzer_1.analyzeNode)(node, designSystemConfig, skipComponentAnalysis);
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
        // This is a local instance, analyze its internal structure
        const instanceAnalysis = {
            colors: { compliant: 0, total: 0, violations: [] },
            fonts: { compliant: 0, total: 0, violations: [] },
            shadows: { compliant: 0, total: 0, violations: [] },
            components: { compliant: 0, total: 0, violations: [] }
        };
        // Analyze the instance's children recursively
        if ('children' in node && node.children) {
            for (const child of node.children) {
                await analyzeNodeRecursively(child, instanceAnalysis);
            }
        }
        // Add local instance analysis to main analysis
        analysis.colors.violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: `Local instance contains ${instanceAnalysis.colors.violations.length} color violations`,
            currentValue: 'Local Instance',
            expectedValue: 'Design System Component'
        });
    }
}
async function generateConfigurationFiles() {
    try {
        // Extrair componentes principais
        const components = {};
        const colorStyles = {};
        const textStyles = {};
        const effectStyles = {};
        // Buscar todos os componentes principais na página atual
        const mainComponents = figma.currentPage.findAll(node => node.type === 'COMPONENT');
        mainComponents.forEach(component => {
            const comp = component;
            components[comp.name] = {
                key: comp.id
            };
        });
        // Buscar estilos de cor locais
        figma.getLocalPaintStyles().forEach(style => {
            colorStyles[style.name] = style.id;
        });
        // Buscar estilos de texto locais  
        figma.getLocalTextStyles().forEach(style => {
            textStyles[style.name] = style.id;
        });
        // Buscar estilos de efeito locais
        figma.getLocalEffectStyles().forEach(style => {
            effectStyles[style.name] = style.id;
        });
        // Enviar arquivos para a UI
        figma.ui.postMessage({
            type: 'config-files-generated',
            componentsFile: { components },
            stylesFile: { colorStyles, textStyles, effectStyles }
        });
    }
    catch (error) {
        figma.ui.postMessage({
            type: 'config-generation-error',
            message: 'Erro ao gerar arquivos de configuração: ' + error.message
        });
    }
}
// Initialize the plugin
figma.ui.postMessage({ type: 'plugin-initialized' });
