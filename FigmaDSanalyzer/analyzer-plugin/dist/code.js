/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/analyzer.ts":
/*!*************************!*\
  !*** ./src/analyzer.ts ***!
  \*************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.analyzeNode = analyzeNode;
const utils_1 = __webpack_require__(/*! ./utils */ "./src/utils.ts");
function analyzeNode(node, designSystem, skipComponentAnalysis = false) {
    const result = {
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
function analyzeColors(node, designSystemColors, result) {
    const colors = [];
    // Extract fill colors
    if ('fills' in node && node.fills && Array.isArray(node.fills)) {
        for (const fill of node.fills) {
            if (fill.type === 'SOLID' && fill.color) {
                const hexColor = (0, utils_1.rgbToHex)(fill.color.r * 255, fill.color.g * 255, fill.color.b * 255);
                colors.push(hexColor);
            }
        }
    }
    // Extract stroke colors
    if ('strokes' in node && node.strokes && Array.isArray(node.strokes)) {
        for (const stroke of node.strokes) {
            if (stroke.type === 'SOLID' && stroke.color) {
                const hexColor = (0, utils_1.rgbToHex)(stroke.color.r * 255, stroke.color.g * 255, stroke.color.b * 255);
                colors.push(hexColor);
            }
        }
    }
    // Check each color against design system
    for (const color of colors) {
        result.colors.total++;
        const isCompliant = designSystemColors.some(dsColor => (0, utils_1.isSimilarColor)(color, dsColor));
        if (isCompliant) {
            result.colors.compliant++;
        }
        else {
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
function analyzeFonts(node, designSystemFonts, result) {
    if (node.type !== 'TEXT')
        return;
    const textNode = node;
    const textStyles = (0, utils_1.extractTextStyles)(textNode);
    for (const style of textStyles) {
        result.fonts.total++;
        const isCompliant = designSystemFonts.some(dsFont => {
            return dsFont.family === style.fontFamily &&
                dsFont.weights.includes(style.fontWeight);
        });
        if (isCompliant) {
            result.fonts.compliant++;
        }
        else {
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
function analyzeShadows(node, designSystemShadows, result) {
    if (!('effects' in node) || !node.effects)
        return;
    const shadows = (0, utils_1.extractEffects)(node);
    for (const shadow of shadows) {
        result.shadows.total++;
        const isCompliant = designSystemShadows.some(dsShadow => {
            return Math.abs(dsShadow.blur - shadow.blur) <= 1 &&
                Math.abs(dsShadow.offsetX - shadow.offsetX) <= 1 &&
                Math.abs(dsShadow.offsetY - shadow.offsetY) <= 1 &&
                (0, utils_1.isSimilarColor)(shadow.color, dsShadow.color);
        });
        if (isCompliant) {
            result.shadows.compliant++;
        }
        else {
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
function analyzeComponents(node, componentPrefixes, result) {
    // Only analyze actual components and instances
    if (node.type !== 'COMPONENT' && node.type !== 'INSTANCE')
        return;
    result.components.total++;
    // Check if it's a design system component
    const isDesignSystemComponent = componentPrefixes.some(prefix => node.name.startsWith(prefix));
    if (isDesignSystemComponent) {
        result.components.compliant++;
    }
    else {
        result.components.violations.push({
            nodeId: node.id,
            nodeName: node.name,
            issue: node.type === 'INSTANCE' ? 'Instance not from design system' : 'Component not following design system naming',
            currentValue: node.name,
            expectedValue: `Component with prefix: ${componentPrefixes.join(', ')}`
        });
    }
}


/***/ }),

/***/ "./src/designSystem.ts":
/*!*****************************!*\
  !*** ./src/designSystem.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getDefaultDesignSystem = getDefaultDesignSystem;
function getDefaultDesignSystem() {
    return {
        colors: [
            '#000000', '#FFFFFF', '#F5F5F5', '#E5E5E5',
            '#007AFF', '#5856D6', '#AF52DE', '#FF2D92',
            '#FF3B30', '#FF9500', '#FFCC02', '#30B0C7',
            '#28CD41', '#55BEF0', '#007AFF', '#5AC8FA'
        ],
        fonts: [
            { family: 'Inter', weights: [400, 500, 600, 700] },
            { family: 'SF Pro Display', weights: [400, 500, 600, 700] },
            { family: 'Roboto', weights: [300, 400, 500, 700] }
        ],
        shadows: [
            {
                name: 'Small',
                blur: 4,
                offsetX: 0,
                offsetY: 2,
                color: '#00000025'
            },
            {
                name: 'Medium',
                blur: 8,
                offsetX: 0,
                offsetY: 4,
                color: '#00000025'
            },
            {
                name: 'Large',
                blur: 16,
                offsetX: 0,
                offsetY: 8,
                color: '#00000025'
            }
        ],
        componentPrefixes: ['DS/', 'Component/', 'UI/']
    };
}


/***/ }),

/***/ "./src/utils.ts":
/*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
/***/ ((__unused_webpack_module, exports) => {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.hexToRgb = hexToRgb;
exports.rgbToHex = rgbToHex;
exports.isSimilarColor = isSimilarColor;
exports.extractTextStyles = extractTextStyles;
exports.extractEffects = extractEffects;
exports.formatPercentage = formatPercentage;
exports.getComplianceColor = getComplianceColor;
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
function rgbToHex(r, g, b) {
    const componentToHex = (c) => {
        const hex = Math.round(c).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function isSimilarColor(color1, color2, threshold = 10) {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    if (!rgb1 || !rgb2)
        return false;
    const distance = Math.sqrt(Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2));
    return distance <= threshold;
}
function extractTextStyles(textNode) {
    const styles = [];
    if (typeof textNode.fontName === 'object' && 'family' in textNode.fontName) {
        // Single text style
        styles.push({
            fontFamily: textNode.fontName.family,
            fontWeight: 400 // Default weight
        });
    }
    return styles;
}
function extractEffects(node) {
    var _a, _b;
    const effects = [];
    if (!('effects' in node) || !node.effects)
        return effects;
    for (const effect of node.effects) {
        if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
            const color = effect.color ?
                rgbToHex(effect.color.r * 255, effect.color.g * 255, effect.color.b * 255) :
                '#000000';
            effects.push({
                blur: effect.radius || 0,
                offsetX: ((_a = effect.offset) === null || _a === void 0 ? void 0 : _a.x) || 0,
                offsetY: ((_b = effect.offset) === null || _b === void 0 ? void 0 : _b.y) || 0,
                color
            });
        }
    }
    return effects;
}
function formatPercentage(value) {
    return `${Math.round(value)}%`;
}
function getComplianceColor(percentage) {
    if (percentage >= 90)
        return '#28CD41';
    if (percentage >= 70)
        return '#FFCC02';
    return '#FF3B30';
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
var exports = __webpack_exports__;
/*!*****************!*\
  !*** ./code.ts ***!
  \*****************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const analyzer_1 = __webpack_require__(/*! ./src/analyzer */ "./src/analyzer.ts");
const designSystem_1 = __webpack_require__(/*! ./src/designSystem */ "./src/designSystem.ts");
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

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQWE7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0QsbUJBQW1CO0FBQ25CLGdCQUFnQixtQkFBTyxDQUFDLCtCQUFTO0FBQ2pDO0FBQ0E7QUFDQSxrQkFBa0Isd0NBQXdDO0FBQzFELGlCQUFpQix3Q0FBd0M7QUFDekQsbUJBQW1CLHdDQUF3QztBQUMzRCxzQkFBc0I7QUFDdEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaUNBQWlDLGtCQUFrQixFQUFFLGlCQUFpQjtBQUN0RTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSx1Q0FBdUMsWUFBWSxZQUFZLGVBQWUsR0FBRyxlQUFlO0FBQ2hHO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EscURBQXFELDZCQUE2QjtBQUNsRixTQUFTO0FBQ1Q7QUFDQTs7Ozs7Ozs7Ozs7QUNuSWE7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0QsOEJBQThCO0FBQzlCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGNBQWMsZ0RBQWdEO0FBQzlELGNBQWMseURBQXlEO0FBQ3ZFLGNBQWM7QUFDZDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsYUFBYTtBQUNiO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7OztBQ3pDYTtBQUNiLDhDQUE2QyxFQUFFLGFBQWEsRUFBQztBQUM3RCxnQkFBZ0I7QUFDaEIsZ0JBQWdCO0FBQ2hCLHNCQUFzQjtBQUN0Qix5QkFBeUI7QUFDekIsc0JBQXNCO0FBQ3RCLHdCQUF3QjtBQUN4QiwwQkFBMEI7QUFDMUI7QUFDQSxnQ0FBZ0MsRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFO0FBQzFEO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWE7QUFDYjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsY0FBYyxrQkFBa0I7QUFDaEM7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztVQzFFQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7Ozs7Ozs7O0FDdEJhO0FBQ2IsOENBQTZDLEVBQUUsYUFBYSxFQUFDO0FBQzdELG1CQUFtQixtQkFBTyxDQUFDLHlDQUFnQjtBQUMzQyx1QkFBdUIsbUJBQU8sQ0FBQyxpREFBb0I7QUFDbkQ7QUFDQSx5QkFBeUIseUJBQXlCO0FBQ2xEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQSxrQkFBa0Isd0NBQXdDO0FBQzFELGlCQUFpQix3Q0FBd0M7QUFDekQsbUJBQW1CLHdDQUF3QztBQUMzRCxzQkFBc0I7QUFDdEI7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Esc0JBQXNCLHdDQUF3QztBQUM5RCxxQkFBcUIsd0NBQXdDO0FBQzdELHVCQUF1Qix3Q0FBd0M7QUFDL0QsMEJBQTBCO0FBQzFCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSw4Q0FBOEMsMkNBQTJDO0FBQ3pGO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsOEJBQThCLFlBQVk7QUFDMUMsMEJBQTBCO0FBQzFCLFNBQVM7QUFDVDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUO0FBQ0E7QUFDQTtBQUNBLHVCQUF1Qiw0QkFBNEIiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly93b3Jrc3BhY2UvLi9zcmMvYW5hbHl6ZXIudHMiLCJ3ZWJwYWNrOi8vd29ya3NwYWNlLy4vc3JjL2Rlc2lnblN5c3RlbS50cyIsIndlYnBhY2s6Ly93b3Jrc3BhY2UvLi9zcmMvdXRpbHMudHMiLCJ3ZWJwYWNrOi8vd29ya3NwYWNlL3dlYnBhY2svYm9vdHN0cmFwIiwid2VicGFjazovL3dvcmtzcGFjZS8uL2NvZGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmFuYWx5emVOb2RlID0gYW5hbHl6ZU5vZGU7XG5jb25zdCB1dGlsc18xID0gcmVxdWlyZShcIi4vdXRpbHNcIik7XG5mdW5jdGlvbiBhbmFseXplTm9kZShub2RlLCBkZXNpZ25TeXN0ZW0sIHNraXBDb21wb25lbnRBbmFseXNpcyA9IGZhbHNlKSB7XG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgICBjb2xvcnM6IHsgY29tcGxpYW50OiAwLCB0b3RhbDogMCwgdmlvbGF0aW9uczogW10gfSxcbiAgICAgICAgZm9udHM6IHsgY29tcGxpYW50OiAwLCB0b3RhbDogMCwgdmlvbGF0aW9uczogW10gfSxcbiAgICAgICAgc2hhZG93czogeyBjb21wbGlhbnQ6IDAsIHRvdGFsOiAwLCB2aW9sYXRpb25zOiBbXSB9LFxuICAgICAgICBjb21wb25lbnRzOiB7IGNvbXBsaWFudDogMCwgdG90YWw6IDAsIHZpb2xhdGlvbnM6IFtdIH1cbiAgICB9O1xuICAgIC8vIEFuYWx5emUgY29sb3JzXG4gICAgYW5hbHl6ZUNvbG9ycyhub2RlLCBkZXNpZ25TeXN0ZW0uY29sb3JzLCByZXN1bHQpO1xuICAgIC8vIEFuYWx5emUgZm9udHNcbiAgICBhbmFseXplRm9udHMobm9kZSwgZGVzaWduU3lzdGVtLmZvbnRzLCByZXN1bHQpO1xuICAgIC8vIEFuYWx5emUgc2hhZG93cy9lZmZlY3RzXG4gICAgYW5hbHl6ZVNoYWRvd3Mobm9kZSwgZGVzaWduU3lzdGVtLnNoYWRvd3MsIHJlc3VsdCk7XG4gICAgLy8gQW5hbHl6ZSBjb21wb25lbnRzIChpZiBub3Qgc2tpcHBlZClcbiAgICBpZiAoIXNraXBDb21wb25lbnRBbmFseXNpcykge1xuICAgICAgICBhbmFseXplQ29tcG9uZW50cyhub2RlLCBkZXNpZ25TeXN0ZW0uY29tcG9uZW50UHJlZml4ZXMsIHJlc3VsdCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59XG5mdW5jdGlvbiBhbmFseXplQ29sb3JzKG5vZGUsIGRlc2lnblN5c3RlbUNvbG9ycywgcmVzdWx0KSB7XG4gICAgY29uc3QgY29sb3JzID0gW107XG4gICAgLy8gRXh0cmFjdCBmaWxsIGNvbG9yc1xuICAgIGlmICgnZmlsbHMnIGluIG5vZGUgJiYgbm9kZS5maWxscyAmJiBBcnJheS5pc0FycmF5KG5vZGUuZmlsbHMpKSB7XG4gICAgICAgIGZvciAoY29uc3QgZmlsbCBvZiBub2RlLmZpbGxzKSB7XG4gICAgICAgICAgICBpZiAoZmlsbC50eXBlID09PSAnU09MSUQnICYmIGZpbGwuY29sb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZXhDb2xvciA9ICgwLCB1dGlsc18xLnJnYlRvSGV4KShmaWxsLmNvbG9yLnIgKiAyNTUsIGZpbGwuY29sb3IuZyAqIDI1NSwgZmlsbC5jb2xvci5iICogMjU1KTtcbiAgICAgICAgICAgICAgICBjb2xvcnMucHVzaChoZXhDb2xvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gRXh0cmFjdCBzdHJva2UgY29sb3JzXG4gICAgaWYgKCdzdHJva2VzJyBpbiBub2RlICYmIG5vZGUuc3Ryb2tlcyAmJiBBcnJheS5pc0FycmF5KG5vZGUuc3Ryb2tlcykpIHtcbiAgICAgICAgZm9yIChjb25zdCBzdHJva2Ugb2Ygbm9kZS5zdHJva2VzKSB7XG4gICAgICAgICAgICBpZiAoc3Ryb2tlLnR5cGUgPT09ICdTT0xJRCcgJiYgc3Ryb2tlLmNvbG9yKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGV4Q29sb3IgPSAoMCwgdXRpbHNfMS5yZ2JUb0hleCkoc3Ryb2tlLmNvbG9yLnIgKiAyNTUsIHN0cm9rZS5jb2xvci5nICogMjU1LCBzdHJva2UuY29sb3IuYiAqIDI1NSk7XG4gICAgICAgICAgICAgICAgY29sb3JzLnB1c2goaGV4Q29sb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIC8vIENoZWNrIGVhY2ggY29sb3IgYWdhaW5zdCBkZXNpZ24gc3lzdGVtXG4gICAgZm9yIChjb25zdCBjb2xvciBvZiBjb2xvcnMpIHtcbiAgICAgICAgcmVzdWx0LmNvbG9ycy50b3RhbCsrO1xuICAgICAgICBjb25zdCBpc0NvbXBsaWFudCA9IGRlc2lnblN5c3RlbUNvbG9ycy5zb21lKGRzQ29sb3IgPT4gKDAsIHV0aWxzXzEuaXNTaW1pbGFyQ29sb3IpKGNvbG9yLCBkc0NvbG9yKSk7XG4gICAgICAgIGlmIChpc0NvbXBsaWFudCkge1xuICAgICAgICAgICAgcmVzdWx0LmNvbG9ycy5jb21wbGlhbnQrKztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5jb2xvcnMudmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICBub2RlSWQ6IG5vZGUuaWQsXG4gICAgICAgICAgICAgICAgbm9kZU5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICBpc3N1ZTogJ0NvbG9yIG5vdCBpbiBkZXNpZ24gc3lzdGVtJyxcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWU6IGNvbG9yLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkVmFsdWU6ICdEZXNpZ24gc3lzdGVtIGNvbG9yJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBhbmFseXplRm9udHMobm9kZSwgZGVzaWduU3lzdGVtRm9udHMsIHJlc3VsdCkge1xuICAgIGlmIChub2RlLnR5cGUgIT09ICdURVhUJylcbiAgICAgICAgcmV0dXJuO1xuICAgIGNvbnN0IHRleHROb2RlID0gbm9kZTtcbiAgICBjb25zdCB0ZXh0U3R5bGVzID0gKDAsIHV0aWxzXzEuZXh0cmFjdFRleHRTdHlsZXMpKHRleHROb2RlKTtcbiAgICBmb3IgKGNvbnN0IHN0eWxlIG9mIHRleHRTdHlsZXMpIHtcbiAgICAgICAgcmVzdWx0LmZvbnRzLnRvdGFsKys7XG4gICAgICAgIGNvbnN0IGlzQ29tcGxpYW50ID0gZGVzaWduU3lzdGVtRm9udHMuc29tZShkc0ZvbnQgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGRzRm9udC5mYW1pbHkgPT09IHN0eWxlLmZvbnRGYW1pbHkgJiZcbiAgICAgICAgICAgICAgICBkc0ZvbnQud2VpZ2h0cy5pbmNsdWRlcyhzdHlsZS5mb250V2VpZ2h0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChpc0NvbXBsaWFudCkge1xuICAgICAgICAgICAgcmVzdWx0LmZvbnRzLmNvbXBsaWFudCsrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LmZvbnRzLnZpb2xhdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgbm9kZUlkOiBub2RlLmlkLFxuICAgICAgICAgICAgICAgIG5vZGVOYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICAgICAgaXNzdWU6ICdGb250IG5vdCBpbiBkZXNpZ24gc3lzdGVtJyxcbiAgICAgICAgICAgICAgICBjdXJyZW50VmFsdWU6IGAke3N0eWxlLmZvbnRGYW1pbHl9ICR7c3R5bGUuZm9udFdlaWdodH1gLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkVmFsdWU6ICdEZXNpZ24gc3lzdGVtIGZvbnQnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn1cbmZ1bmN0aW9uIGFuYWx5emVTaGFkb3dzKG5vZGUsIGRlc2lnblN5c3RlbVNoYWRvd3MsIHJlc3VsdCkge1xuICAgIGlmICghKCdlZmZlY3RzJyBpbiBub2RlKSB8fCAhbm9kZS5lZmZlY3RzKVxuICAgICAgICByZXR1cm47XG4gICAgY29uc3Qgc2hhZG93cyA9ICgwLCB1dGlsc18xLmV4dHJhY3RFZmZlY3RzKShub2RlKTtcbiAgICBmb3IgKGNvbnN0IHNoYWRvdyBvZiBzaGFkb3dzKSB7XG4gICAgICAgIHJlc3VsdC5zaGFkb3dzLnRvdGFsKys7XG4gICAgICAgIGNvbnN0IGlzQ29tcGxpYW50ID0gZGVzaWduU3lzdGVtU2hhZG93cy5zb21lKGRzU2hhZG93ID0+IHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmFicyhkc1NoYWRvdy5ibHVyIC0gc2hhZG93LmJsdXIpIDw9IDEgJiZcbiAgICAgICAgICAgICAgICBNYXRoLmFicyhkc1NoYWRvdy5vZmZzZXRYIC0gc2hhZG93Lm9mZnNldFgpIDw9IDEgJiZcbiAgICAgICAgICAgICAgICBNYXRoLmFicyhkc1NoYWRvdy5vZmZzZXRZIC0gc2hhZG93Lm9mZnNldFkpIDw9IDEgJiZcbiAgICAgICAgICAgICAgICAoMCwgdXRpbHNfMS5pc1NpbWlsYXJDb2xvcikoc2hhZG93LmNvbG9yLCBkc1NoYWRvdy5jb2xvcik7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoaXNDb21wbGlhbnQpIHtcbiAgICAgICAgICAgIHJlc3VsdC5zaGFkb3dzLmNvbXBsaWFudCsrO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LnNoYWRvd3MudmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICBub2RlSWQ6IG5vZGUuaWQsXG4gICAgICAgICAgICAgICAgbm9kZU5hbWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgICAgICBpc3N1ZTogJ1NoYWRvdyBub3QgaW4gZGVzaWduIHN5c3RlbScsXG4gICAgICAgICAgICAgICAgY3VycmVudFZhbHVlOiBgYmx1cjogJHtzaGFkb3cuYmx1cn0sIG9mZnNldDogJHtzaGFkb3cub2Zmc2V0WH0sJHtzaGFkb3cub2Zmc2V0WX1gLFxuICAgICAgICAgICAgICAgIGV4cGVjdGVkVmFsdWU6ICdEZXNpZ24gc3lzdGVtIHNoYWRvdydcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufVxuZnVuY3Rpb24gYW5hbHl6ZUNvbXBvbmVudHMobm9kZSwgY29tcG9uZW50UHJlZml4ZXMsIHJlc3VsdCkge1xuICAgIC8vIE9ubHkgYW5hbHl6ZSBhY3R1YWwgY29tcG9uZW50cyBhbmQgaW5zdGFuY2VzXG4gICAgaWYgKG5vZGUudHlwZSAhPT0gJ0NPTVBPTkVOVCcgJiYgbm9kZS50eXBlICE9PSAnSU5TVEFOQ0UnKVxuICAgICAgICByZXR1cm47XG4gICAgcmVzdWx0LmNvbXBvbmVudHMudG90YWwrKztcbiAgICAvLyBDaGVjayBpZiBpdCdzIGEgZGVzaWduIHN5c3RlbSBjb21wb25lbnRcbiAgICBjb25zdCBpc0Rlc2lnblN5c3RlbUNvbXBvbmVudCA9IGNvbXBvbmVudFByZWZpeGVzLnNvbWUocHJlZml4ID0+IG5vZGUubmFtZS5zdGFydHNXaXRoKHByZWZpeCkpO1xuICAgIGlmIChpc0Rlc2lnblN5c3RlbUNvbXBvbmVudCkge1xuICAgICAgICByZXN1bHQuY29tcG9uZW50cy5jb21wbGlhbnQrKztcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHJlc3VsdC5jb21wb25lbnRzLnZpb2xhdGlvbnMucHVzaCh7XG4gICAgICAgICAgICBub2RlSWQ6IG5vZGUuaWQsXG4gICAgICAgICAgICBub2RlTmFtZTogbm9kZS5uYW1lLFxuICAgICAgICAgICAgaXNzdWU6IG5vZGUudHlwZSA9PT0gJ0lOU1RBTkNFJyA/ICdJbnN0YW5jZSBub3QgZnJvbSBkZXNpZ24gc3lzdGVtJyA6ICdDb21wb25lbnQgbm90IGZvbGxvd2luZyBkZXNpZ24gc3lzdGVtIG5hbWluZycsXG4gICAgICAgICAgICBjdXJyZW50VmFsdWU6IG5vZGUubmFtZSxcbiAgICAgICAgICAgIGV4cGVjdGVkVmFsdWU6IGBDb21wb25lbnQgd2l0aCBwcmVmaXg6ICR7Y29tcG9uZW50UHJlZml4ZXMuam9pbignLCAnKX1gXG4gICAgICAgIH0pO1xuICAgIH1cbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5nZXREZWZhdWx0RGVzaWduU3lzdGVtID0gZ2V0RGVmYXVsdERlc2lnblN5c3RlbTtcbmZ1bmN0aW9uIGdldERlZmF1bHREZXNpZ25TeXN0ZW0oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY29sb3JzOiBbXG4gICAgICAgICAgICAnIzAwMDAwMCcsICcjRkZGRkZGJywgJyNGNUY1RjUnLCAnI0U1RTVFNScsXG4gICAgICAgICAgICAnIzAwN0FGRicsICcjNTg1NkQ2JywgJyNBRjUyREUnLCAnI0ZGMkQ5MicsXG4gICAgICAgICAgICAnI0ZGM0IzMCcsICcjRkY5NTAwJywgJyNGRkNDMDInLCAnIzMwQjBDNycsXG4gICAgICAgICAgICAnIzI4Q0Q0MScsICcjNTVCRUYwJywgJyMwMDdBRkYnLCAnIzVBQzhGQSdcbiAgICAgICAgXSxcbiAgICAgICAgZm9udHM6IFtcbiAgICAgICAgICAgIHsgZmFtaWx5OiAnSW50ZXInLCB3ZWlnaHRzOiBbNDAwLCA1MDAsIDYwMCwgNzAwXSB9LFxuICAgICAgICAgICAgeyBmYW1pbHk6ICdTRiBQcm8gRGlzcGxheScsIHdlaWdodHM6IFs0MDAsIDUwMCwgNjAwLCA3MDBdIH0sXG4gICAgICAgICAgICB7IGZhbWlseTogJ1JvYm90bycsIHdlaWdodHM6IFszMDAsIDQwMCwgNTAwLCA3MDBdIH1cbiAgICAgICAgXSxcbiAgICAgICAgc2hhZG93czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdTbWFsbCcsXG4gICAgICAgICAgICAgICAgYmx1cjogNCxcbiAgICAgICAgICAgICAgICBvZmZzZXRYOiAwLFxuICAgICAgICAgICAgICAgIG9mZnNldFk6IDIsXG4gICAgICAgICAgICAgICAgY29sb3I6ICcjMDAwMDAwMjUnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdNZWRpdW0nLFxuICAgICAgICAgICAgICAgIGJsdXI6IDgsXG4gICAgICAgICAgICAgICAgb2Zmc2V0WDogMCxcbiAgICAgICAgICAgICAgICBvZmZzZXRZOiA0LFxuICAgICAgICAgICAgICAgIGNvbG9yOiAnIzAwMDAwMDI1J1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnTGFyZ2UnLFxuICAgICAgICAgICAgICAgIGJsdXI6IDE2LFxuICAgICAgICAgICAgICAgIG9mZnNldFg6IDAsXG4gICAgICAgICAgICAgICAgb2Zmc2V0WTogOCxcbiAgICAgICAgICAgICAgICBjb2xvcjogJyMwMDAwMDAyNSdcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSxcbiAgICAgICAgY29tcG9uZW50UHJlZml4ZXM6IFsnRFMvJywgJ0NvbXBvbmVudC8nLCAnVUkvJ11cbiAgICB9O1xufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmhleFRvUmdiID0gaGV4VG9SZ2I7XG5leHBvcnRzLnJnYlRvSGV4ID0gcmdiVG9IZXg7XG5leHBvcnRzLmlzU2ltaWxhckNvbG9yID0gaXNTaW1pbGFyQ29sb3I7XG5leHBvcnRzLmV4dHJhY3RUZXh0U3R5bGVzID0gZXh0cmFjdFRleHRTdHlsZXM7XG5leHBvcnRzLmV4dHJhY3RFZmZlY3RzID0gZXh0cmFjdEVmZmVjdHM7XG5leHBvcnRzLmZvcm1hdFBlcmNlbnRhZ2UgPSBmb3JtYXRQZXJjZW50YWdlO1xuZXhwb3J0cy5nZXRDb21wbGlhbmNlQ29sb3IgPSBnZXRDb21wbGlhbmNlQ29sb3I7XG5mdW5jdGlvbiBoZXhUb1JnYihoZXgpIHtcbiAgICBjb25zdCByZXN1bHQgPSAvXiM/KFthLWZcXGRdezJ9KShbYS1mXFxkXXsyfSkoW2EtZlxcZF17Mn0pJC9pLmV4ZWMoaGV4KTtcbiAgICByZXR1cm4gcmVzdWx0ID8ge1xuICAgICAgICByOiBwYXJzZUludChyZXN1bHRbMV0sIDE2KSxcbiAgICAgICAgZzogcGFyc2VJbnQocmVzdWx0WzJdLCAxNiksXG4gICAgICAgIGI6IHBhcnNlSW50KHJlc3VsdFszXSwgMTYpXG4gICAgfSA6IG51bGw7XG59XG5mdW5jdGlvbiByZ2JUb0hleChyLCBnLCBiKSB7XG4gICAgY29uc3QgY29tcG9uZW50VG9IZXggPSAoYykgPT4ge1xuICAgICAgICBjb25zdCBoZXggPSBNYXRoLnJvdW5kKGMpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgcmV0dXJuIGhleC5sZW5ndGggPT09IDEgPyBcIjBcIiArIGhleCA6IGhleDtcbiAgICB9O1xuICAgIHJldHVybiBcIiNcIiArIGNvbXBvbmVudFRvSGV4KHIpICsgY29tcG9uZW50VG9IZXgoZykgKyBjb21wb25lbnRUb0hleChiKTtcbn1cbmZ1bmN0aW9uIGlzU2ltaWxhckNvbG9yKGNvbG9yMSwgY29sb3IyLCB0aHJlc2hvbGQgPSAxMCkge1xuICAgIGNvbnN0IHJnYjEgPSBoZXhUb1JnYihjb2xvcjEpO1xuICAgIGNvbnN0IHJnYjIgPSBoZXhUb1JnYihjb2xvcjIpO1xuICAgIGlmICghcmdiMSB8fCAhcmdiMilcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGRpc3RhbmNlID0gTWF0aC5zcXJ0KE1hdGgucG93KHJnYjEuciAtIHJnYjIuciwgMikgK1xuICAgICAgICBNYXRoLnBvdyhyZ2IxLmcgLSByZ2IyLmcsIDIpICtcbiAgICAgICAgTWF0aC5wb3cocmdiMS5iIC0gcmdiMi5iLCAyKSk7XG4gICAgcmV0dXJuIGRpc3RhbmNlIDw9IHRocmVzaG9sZDtcbn1cbmZ1bmN0aW9uIGV4dHJhY3RUZXh0U3R5bGVzKHRleHROb2RlKSB7XG4gICAgY29uc3Qgc3R5bGVzID0gW107XG4gICAgaWYgKHR5cGVvZiB0ZXh0Tm9kZS5mb250TmFtZSA9PT0gJ29iamVjdCcgJiYgJ2ZhbWlseScgaW4gdGV4dE5vZGUuZm9udE5hbWUpIHtcbiAgICAgICAgLy8gU2luZ2xlIHRleHQgc3R5bGVcbiAgICAgICAgc3R5bGVzLnB1c2goe1xuICAgICAgICAgICAgZm9udEZhbWlseTogdGV4dE5vZGUuZm9udE5hbWUuZmFtaWx5LFxuICAgICAgICAgICAgZm9udFdlaWdodDogNDAwIC8vIERlZmF1bHQgd2VpZ2h0XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gc3R5bGVzO1xufVxuZnVuY3Rpb24gZXh0cmFjdEVmZmVjdHMobm9kZSkge1xuICAgIHZhciBfYSwgX2I7XG4gICAgY29uc3QgZWZmZWN0cyA9IFtdO1xuICAgIGlmICghKCdlZmZlY3RzJyBpbiBub2RlKSB8fCAhbm9kZS5lZmZlY3RzKVxuICAgICAgICByZXR1cm4gZWZmZWN0cztcbiAgICBmb3IgKGNvbnN0IGVmZmVjdCBvZiBub2RlLmVmZmVjdHMpIHtcbiAgICAgICAgaWYgKGVmZmVjdC50eXBlID09PSAnRFJPUF9TSEFET1cnIHx8IGVmZmVjdC50eXBlID09PSAnSU5ORVJfU0hBRE9XJykge1xuICAgICAgICAgICAgY29uc3QgY29sb3IgPSBlZmZlY3QuY29sb3IgP1xuICAgICAgICAgICAgICAgIHJnYlRvSGV4KGVmZmVjdC5jb2xvci5yICogMjU1LCBlZmZlY3QuY29sb3IuZyAqIDI1NSwgZWZmZWN0LmNvbG9yLmIgKiAyNTUpIDpcbiAgICAgICAgICAgICAgICAnIzAwMDAwMCc7XG4gICAgICAgICAgICBlZmZlY3RzLnB1c2goe1xuICAgICAgICAgICAgICAgIGJsdXI6IGVmZmVjdC5yYWRpdXMgfHwgMCxcbiAgICAgICAgICAgICAgICBvZmZzZXRYOiAoKF9hID0gZWZmZWN0Lm9mZnNldCkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLngpIHx8IDAsXG4gICAgICAgICAgICAgICAgb2Zmc2V0WTogKChfYiA9IGVmZmVjdC5vZmZzZXQpID09PSBudWxsIHx8IF9iID09PSB2b2lkIDAgPyB2b2lkIDAgOiBfYi55KSB8fCAwLFxuICAgICAgICAgICAgICAgIGNvbG9yXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZWZmZWN0cztcbn1cbmZ1bmN0aW9uIGZvcm1hdFBlcmNlbnRhZ2UodmFsdWUpIHtcbiAgICByZXR1cm4gYCR7TWF0aC5yb3VuZCh2YWx1ZSl9JWA7XG59XG5mdW5jdGlvbiBnZXRDb21wbGlhbmNlQ29sb3IocGVyY2VudGFnZSkge1xuICAgIGlmIChwZXJjZW50YWdlID49IDkwKVxuICAgICAgICByZXR1cm4gJyMyOENENDEnO1xuICAgIGlmIChwZXJjZW50YWdlID49IDcwKVxuICAgICAgICByZXR1cm4gJyNGRkNDMDInO1xuICAgIHJldHVybiAnI0ZGM0IzMCc7XG59XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBhbmFseXplcl8xID0gcmVxdWlyZShcIi4vc3JjL2FuYWx5emVyXCIpO1xuY29uc3QgZGVzaWduU3lzdGVtXzEgPSByZXF1aXJlKFwiLi9zcmMvZGVzaWduU3lzdGVtXCIpO1xuLy8gU2hvdyB0aGUgcGx1Z2luIFVJXG5maWdtYS5zaG93VUkoX19odG1sX18sIHsgd2lkdGg6IDQwMCwgaGVpZ2h0OiA2MDAgfSk7XG4vLyBTdG9yZSBkZXNpZ24gc3lzdGVtIGNvbmZpZ3VyYXRpb25cbmxldCBkZXNpZ25TeXN0ZW1Db25maWcgPSAoMCwgZGVzaWduU3lzdGVtXzEuZ2V0RGVmYXVsdERlc2lnblN5c3RlbSkoKTtcbi8vIEhhbmRsZSBtZXNzYWdlcyBmcm9tIHRoZSBVSVxuZmlnbWEudWkub25tZXNzYWdlID0gYXN5bmMgKG1zZykgPT4ge1xuICAgIHN3aXRjaCAobXNnLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnYW5hbHl6ZS1zZWxlY3Rpb24nOlxuICAgICAgICAgICAgYXdhaXQgYW5hbHl6ZVNlbGVjdGlvbigpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ3VwZGF0ZS1kZXNpZ24tc3lzdGVtJzpcbiAgICAgICAgICAgIGRlc2lnblN5c3RlbUNvbmZpZyA9IG1zZy5jb25maWc7XG4gICAgICAgICAgICBmaWdtYS5jbGllbnRTdG9yYWdlLnNldEFzeW5jKCdkZXNpZ25TeXN0ZW1Db25maWcnLCBkZXNpZ25TeXN0ZW1Db25maWcpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2dldC1kZXNpZ24tc3lzdGVtJzpcbiAgICAgICAgICAgIGNvbnN0IHNhdmVkQ29uZmlnID0gYXdhaXQgZmlnbWEuY2xpZW50U3RvcmFnZS5nZXRBc3luYygnZGVzaWduU3lzdGVtQ29uZmlnJyk7XG4gICAgICAgICAgICBpZiAoc2F2ZWRDb25maWcpIHtcbiAgICAgICAgICAgICAgICBkZXNpZ25TeXN0ZW1Db25maWcgPSBzYXZlZENvbmZpZztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgICAgICB0eXBlOiAnZGVzaWduLXN5c3RlbS1sb2FkZWQnLFxuICAgICAgICAgICAgICAgIGNvbmZpZzogZGVzaWduU3lzdGVtQ29uZmlnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdnZW5lcmF0ZS1jb25maWctZmlsZXMnOlxuICAgICAgICAgICAgYXdhaXQgZ2VuZXJhdGVDb25maWd1cmF0aW9uRmlsZXMoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjbG9zZS1wbHVnaW4nOlxuICAgICAgICAgICAgZmlnbWEuY2xvc2VQbHVnaW4oKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgIH1cbn07XG5hc3luYyBmdW5jdGlvbiBhbmFseXplU2VsZWN0aW9uKCkge1xuICAgIGNvbnN0IHNlbGVjdGlvbiA9IGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbjtcbiAgICBpZiAoc2VsZWN0aW9uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgICB0eXBlOiAnYW5hbHlzaXMtZXJyb3InLFxuICAgICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBzZWxlY3QgYXQgbGVhc3Qgb25lIGZyYW1lIHRvIGFuYWx5emUuJ1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCByZXBvcnRzID0gW107XG4gICAgZm9yIChjb25zdCBub2RlIG9mIHNlbGVjdGlvbikge1xuICAgICAgICBpZiAobm9kZS50eXBlID09PSAnRlJBTUUnIHx8IG5vZGUudHlwZSA9PT0gJ0NPTVBPTkVOVCcgfHwgbm9kZS50eXBlID09PSAnSU5TVEFOQ0UnKSB7XG4gICAgICAgICAgICBjb25zdCByZXBvcnQgPSBhd2FpdCBhbmFseXplRnJhbWUobm9kZSk7XG4gICAgICAgICAgICByZXBvcnRzLnB1c2gocmVwb3J0KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7XG4gICAgICAgIHR5cGU6ICdhbmFseXNpcy1jb21wbGV0ZScsXG4gICAgICAgIHJlcG9ydHNcbiAgICB9KTtcbn1cbmFzeW5jIGZ1bmN0aW9uIGFuYWx5emVGcmFtZShmcmFtZSkge1xuICAgIGNvbnN0IGFuYWx5c2lzID0ge1xuICAgICAgICBjb2xvcnM6IHsgY29tcGxpYW50OiAwLCB0b3RhbDogMCwgdmlvbGF0aW9uczogW10gfSxcbiAgICAgICAgZm9udHM6IHsgY29tcGxpYW50OiAwLCB0b3RhbDogMCwgdmlvbGF0aW9uczogW10gfSxcbiAgICAgICAgc2hhZG93czogeyBjb21wbGlhbnQ6IDAsIHRvdGFsOiAwLCB2aW9sYXRpb25zOiBbXSB9LFxuICAgICAgICBjb21wb25lbnRzOiB7IGNvbXBsaWFudDogMCwgdG90YWw6IDAsIHZpb2xhdGlvbnM6IFtdIH1cbiAgICB9O1xuICAgIC8vIFJlY3Vyc2l2ZWx5IGFuYWx5emUgYWxsIGNoaWxkIG5vZGVzXG4gICAgYXdhaXQgYW5hbHl6ZU5vZGVSZWN1cnNpdmVseShmcmFtZSwgYW5hbHlzaXMpO1xuICAgIC8vIENhbGN1bGF0ZSBjb21wbGlhbmNlIHBlcmNlbnRhZ2VzXG4gICAgY29uc3QgY29sb3JDb21wbGlhbmNlID0gYW5hbHlzaXMuY29sb3JzLnRvdGFsID4gMCA/IChhbmFseXNpcy5jb2xvcnMuY29tcGxpYW50IC8gYW5hbHlzaXMuY29sb3JzLnRvdGFsKSAqIDEwMCA6IDEwMDtcbiAgICBjb25zdCBmb250Q29tcGxpYW5jZSA9IGFuYWx5c2lzLmZvbnRzLnRvdGFsID4gMCA/IChhbmFseXNpcy5mb250cy5jb21wbGlhbnQgLyBhbmFseXNpcy5mb250cy50b3RhbCkgKiAxMDAgOiAxMDA7XG4gICAgY29uc3Qgc2hhZG93Q29tcGxpYW5jZSA9IGFuYWx5c2lzLnNoYWRvd3MudG90YWwgPiAwID8gKGFuYWx5c2lzLnNoYWRvd3MuY29tcGxpYW50IC8gYW5hbHlzaXMuc2hhZG93cy50b3RhbCkgKiAxMDAgOiAxMDA7XG4gICAgY29uc3QgY29tcG9uZW50Q29tcGxpYW5jZSA9IGFuYWx5c2lzLmNvbXBvbmVudHMudG90YWwgPiAwID8gKGFuYWx5c2lzLmNvbXBvbmVudHMuY29tcGxpYW50IC8gYW5hbHlzaXMuY29tcG9uZW50cy50b3RhbCkgKiAxMDAgOiAxMDA7XG4gICAgY29uc3Qgb3ZlcmFsbENvbXBsaWFuY2UgPSAoY29sb3JDb21wbGlhbmNlICsgZm9udENvbXBsaWFuY2UgKyBzaGFkb3dDb21wbGlhbmNlICsgY29tcG9uZW50Q29tcGxpYW5jZSkgLyA0O1xuICAgIHJldHVybiB7XG4gICAgICAgIGZyYW1lTmFtZTogZnJhbWUubmFtZSxcbiAgICAgICAgZnJhbWVJZDogZnJhbWUuaWQsXG4gICAgICAgIG92ZXJhbGxDb21wbGlhbmNlOiBNYXRoLnJvdW5kKG92ZXJhbGxDb21wbGlhbmNlKSxcbiAgICAgICAgY29sb3JDb21wbGlhbmNlOiBNYXRoLnJvdW5kKGNvbG9yQ29tcGxpYW5jZSksXG4gICAgICAgIGZvbnRDb21wbGlhbmNlOiBNYXRoLnJvdW5kKGZvbnRDb21wbGlhbmNlKSxcbiAgICAgICAgc2hhZG93Q29tcGxpYW5jZTogTWF0aC5yb3VuZChzaGFkb3dDb21wbGlhbmNlKSxcbiAgICAgICAgY29tcG9uZW50Q29tcGxpYW5jZTogTWF0aC5yb3VuZChjb21wb25lbnRDb21wbGlhbmNlKSxcbiAgICAgICAgYW5hbHlzaXNcbiAgICB9O1xufVxuYXN5bmMgZnVuY3Rpb24gYW5hbHl6ZU5vZGVSZWN1cnNpdmVseShub2RlLCBhbmFseXNpcykge1xuICAgIC8vIFNraXAgc2VjdGlvbnMsIHZlY3RvcnMsIGFuZCBncm91cHMgZm9yIGNvbXBvbmVudCBhbmFseXNpcyBhcyByZXF1ZXN0ZWRcbiAgICBjb25zdCBza2lwQ29tcG9uZW50QW5hbHlzaXMgPSBbJ1NFQ1RJT04nLCAnVkVDVE9SJywgJ0dST1VQJ10uaW5jbHVkZXMobm9kZS50eXBlKTtcbiAgICAvLyBBbmFseXplIGN1cnJlbnQgbm9kZVxuICAgIGNvbnN0IG5vZGVBbmFseXNpcyA9ICgwLCBhbmFseXplcl8xLmFuYWx5emVOb2RlKShub2RlLCBkZXNpZ25TeXN0ZW1Db25maWcsIHNraXBDb21wb25lbnRBbmFseXNpcyk7XG4gICAgLy8gQWdncmVnYXRlIHJlc3VsdHNcbiAgICBhbmFseXNpcy5jb2xvcnMuY29tcGxpYW50ICs9IG5vZGVBbmFseXNpcy5jb2xvcnMuY29tcGxpYW50O1xuICAgIGFuYWx5c2lzLmNvbG9ycy50b3RhbCArPSBub2RlQW5hbHlzaXMuY29sb3JzLnRvdGFsO1xuICAgIGFuYWx5c2lzLmNvbG9ycy52aW9sYXRpb25zLnB1c2goLi4ubm9kZUFuYWx5c2lzLmNvbG9ycy52aW9sYXRpb25zKTtcbiAgICBhbmFseXNpcy5mb250cy5jb21wbGlhbnQgKz0gbm9kZUFuYWx5c2lzLmZvbnRzLmNvbXBsaWFudDtcbiAgICBhbmFseXNpcy5mb250cy50b3RhbCArPSBub2RlQW5hbHlzaXMuZm9udHMudG90YWw7XG4gICAgYW5hbHlzaXMuZm9udHMudmlvbGF0aW9ucy5wdXNoKC4uLm5vZGVBbmFseXNpcy5mb250cy52aW9sYXRpb25zKTtcbiAgICBhbmFseXNpcy5zaGFkb3dzLmNvbXBsaWFudCArPSBub2RlQW5hbHlzaXMuc2hhZG93cy5jb21wbGlhbnQ7XG4gICAgYW5hbHlzaXMuc2hhZG93cy50b3RhbCArPSBub2RlQW5hbHlzaXMuc2hhZG93cy50b3RhbDtcbiAgICBhbmFseXNpcy5zaGFkb3dzLnZpb2xhdGlvbnMucHVzaCguLi5ub2RlQW5hbHlzaXMuc2hhZG93cy52aW9sYXRpb25zKTtcbiAgICBhbmFseXNpcy5jb21wb25lbnRzLmNvbXBsaWFudCArPSBub2RlQW5hbHlzaXMuY29tcG9uZW50cy5jb21wbGlhbnQ7XG4gICAgYW5hbHlzaXMuY29tcG9uZW50cy50b3RhbCArPSBub2RlQW5hbHlzaXMuY29tcG9uZW50cy50b3RhbDtcbiAgICBhbmFseXNpcy5jb21wb25lbnRzLnZpb2xhdGlvbnMucHVzaCguLi5ub2RlQW5hbHlzaXMuY29tcG9uZW50cy52aW9sYXRpb25zKTtcbiAgICAvLyBSZWN1cnNpdmVseSBhbmFseXplIGNoaWxkcmVuXG4gICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSAmJiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgYXdhaXQgYW5hbHl6ZU5vZGVSZWN1cnNpdmVseShjaGlsZCwgYW5hbHlzaXMpO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGxvY2FsIGluc3RhbmNlcyAtIGFuYWx5emUgdGhlaXIgaW50ZXJuYWwgc3RydWN0dXJlXG4gICAgaWYgKG5vZGUudHlwZSA9PT0gJ0lOU1RBTkNFJykge1xuICAgICAgICAvLyBUaGlzIGlzIGEgbG9jYWwgaW5zdGFuY2UsIGFuYWx5emUgaXRzIGludGVybmFsIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCBpbnN0YW5jZUFuYWx5c2lzID0ge1xuICAgICAgICAgICAgY29sb3JzOiB7IGNvbXBsaWFudDogMCwgdG90YWw6IDAsIHZpb2xhdGlvbnM6IFtdIH0sXG4gICAgICAgICAgICBmb250czogeyBjb21wbGlhbnQ6IDAsIHRvdGFsOiAwLCB2aW9sYXRpb25zOiBbXSB9LFxuICAgICAgICAgICAgc2hhZG93czogeyBjb21wbGlhbnQ6IDAsIHRvdGFsOiAwLCB2aW9sYXRpb25zOiBbXSB9LFxuICAgICAgICAgICAgY29tcG9uZW50czogeyBjb21wbGlhbnQ6IDAsIHRvdGFsOiAwLCB2aW9sYXRpb25zOiBbXSB9XG4gICAgICAgIH07XG4gICAgICAgIC8vIEFuYWx5emUgdGhlIGluc3RhbmNlJ3MgY2hpbGRyZW4gcmVjdXJzaXZlbHlcbiAgICAgICAgaWYgKCdjaGlsZHJlbicgaW4gbm9kZSAmJiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICBhd2FpdCBhbmFseXplTm9kZVJlY3Vyc2l2ZWx5KGNoaWxkLCBpbnN0YW5jZUFuYWx5c2lzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgbG9jYWwgaW5zdGFuY2UgYW5hbHlzaXMgdG8gbWFpbiBhbmFseXNpc1xuICAgICAgICBhbmFseXNpcy5jb2xvcnMudmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIG5vZGVJZDogbm9kZS5pZCxcbiAgICAgICAgICAgIG5vZGVOYW1lOiBub2RlLm5hbWUsXG4gICAgICAgICAgICBpc3N1ZTogYExvY2FsIGluc3RhbmNlIGNvbnRhaW5zICR7aW5zdGFuY2VBbmFseXNpcy5jb2xvcnMudmlvbGF0aW9ucy5sZW5ndGh9IGNvbG9yIHZpb2xhdGlvbnNgLFxuICAgICAgICAgICAgY3VycmVudFZhbHVlOiAnTG9jYWwgSW5zdGFuY2UnLFxuICAgICAgICAgICAgZXhwZWN0ZWRWYWx1ZTogJ0Rlc2lnbiBTeXN0ZW0gQ29tcG9uZW50J1xuICAgICAgICB9KTtcbiAgICB9XG59XG5hc3luYyBmdW5jdGlvbiBnZW5lcmF0ZUNvbmZpZ3VyYXRpb25GaWxlcygpIHtcbiAgICB0cnkge1xuICAgICAgICAvLyBFeHRyYWlyIGNvbXBvbmVudGVzIHByaW5jaXBhaXNcbiAgICAgICAgY29uc3QgY29tcG9uZW50cyA9IHt9O1xuICAgICAgICBjb25zdCBjb2xvclN0eWxlcyA9IHt9O1xuICAgICAgICBjb25zdCB0ZXh0U3R5bGVzID0ge307XG4gICAgICAgIGNvbnN0IGVmZmVjdFN0eWxlcyA9IHt9O1xuICAgICAgICAvLyBCdXNjYXIgdG9kb3Mgb3MgY29tcG9uZW50ZXMgcHJpbmNpcGFpcyBuYSBww6FnaW5hIGF0dWFsXG4gICAgICAgIGNvbnN0IG1haW5Db21wb25lbnRzID0gZmlnbWEuY3VycmVudFBhZ2UuZmluZEFsbChub2RlID0+IG5vZGUudHlwZSA9PT0gJ0NPTVBPTkVOVCcpO1xuICAgICAgICBtYWluQ29tcG9uZW50cy5mb3JFYWNoKGNvbXBvbmVudCA9PiB7XG4gICAgICAgICAgICBjb25zdCBjb21wID0gY29tcG9uZW50O1xuICAgICAgICAgICAgY29tcG9uZW50c1tjb21wLm5hbWVdID0ge1xuICAgICAgICAgICAgICAgIGtleTogY29tcC5pZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEJ1c2NhciBlc3RpbG9zIGRlIGNvciBsb2NhaXNcbiAgICAgICAgZmlnbWEuZ2V0TG9jYWxQYWludFN0eWxlcygpLmZvckVhY2goc3R5bGUgPT4ge1xuICAgICAgICAgICAgY29sb3JTdHlsZXNbc3R5bGUubmFtZV0gPSBzdHlsZS5pZDtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEJ1c2NhciBlc3RpbG9zIGRlIHRleHRvIGxvY2FpcyAgXG4gICAgICAgIGZpZ21hLmdldExvY2FsVGV4dFN0eWxlcygpLmZvckVhY2goc3R5bGUgPT4ge1xuICAgICAgICAgICAgdGV4dFN0eWxlc1tzdHlsZS5uYW1lXSA9IHN0eWxlLmlkO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gQnVzY2FyIGVzdGlsb3MgZGUgZWZlaXRvIGxvY2Fpc1xuICAgICAgICBmaWdtYS5nZXRMb2NhbEVmZmVjdFN0eWxlcygpLmZvckVhY2goc3R5bGUgPT4ge1xuICAgICAgICAgICAgZWZmZWN0U3R5bGVzW3N0eWxlLm5hbWVdID0gc3R5bGUuaWQ7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBFbnZpYXIgYXJxdWl2b3MgcGFyYSBhIFVJXG4gICAgICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICAgIHR5cGU6ICdjb25maWctZmlsZXMtZ2VuZXJhdGVkJyxcbiAgICAgICAgICAgIGNvbXBvbmVudHNGaWxlOiB7IGNvbXBvbmVudHMgfSxcbiAgICAgICAgICAgIHN0eWxlc0ZpbGU6IHsgY29sb3JTdHlsZXMsIHRleHRTdHlsZXMsIGVmZmVjdFN0eWxlcyB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgZmlnbWEudWkucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgICAgdHlwZTogJ2NvbmZpZy1nZW5lcmF0aW9uLWVycm9yJyxcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdFcnJvIGFvIGdlcmFyIGFycXVpdm9zIGRlIGNvbmZpZ3VyYcOnw6NvOiAnICsgZXJyb3IubWVzc2FnZVxuICAgICAgICB9KTtcbiAgICB9XG59XG4vLyBJbml0aWFsaXplIHRoZSBwbHVnaW5cbmZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogJ3BsdWdpbi1pbml0aWFsaXplZCcgfSk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=