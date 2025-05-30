"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeNode = analyzeNode;
function analyzeNode(node, designSystem, skipComponentAnalysis = false) {
    const analysis = {
        colors: { compliant: 0, total: 0, violations: [] },
        fonts: { compliant: 0, total: 0, violations: [] },
        shadows: { compliant: 0, total: 0, violations: [] },
        components: { compliant: 0, total: 0, violations: [] }
    };
    // Analyze colors
    if ('fills' in node) {
        analyzePaintStyles(node, designSystem.styles.colors, analysis.colors, 'fill');
    }
    if ('strokes' in node) {
        analyzePaintStyles(node, designSystem.styles.colors, analysis.colors, 'stroke');
    }
    // Analyze text styles
    if (node.type === 'TEXT') {
        analyzeTextStyles(node, designSystem.styles.text, analysis.fonts);
    }
    // Analyze effect styles
    if ('effects' in node) {
        analyzeEffectStyles(node, designSystem.styles.effects, analysis.shadows);
    }
    // Analyze components
    if (!skipComponentAnalysis && node.type === 'INSTANCE') {
        analyzeComponent(node, designSystem.components, analysis.components);
    }
    return analysis;
}
function analyzePaintStyles(node, designSystemColors, analysis, type) {
    const styles = type === 'fill' ? node.fills : node.strokes;
    if (!styles || typeof styles === 'symbol')
        return;
    const paints = styles;
    paints.forEach((style) => {
        if (style.type === 'SOLID') {
            analysis.total++;
            const styleId = type === 'fill' ? node.fillStyleId : node.strokeStyleId;
            if (styleId && typeof styleId !== 'symbol' && Object.values(designSystemColors).includes(styleId)) {
                analysis.compliant++;
            }
            else {
                const violation = {
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
function analyzeTextStyles(node, designSystemTextStyles, analysis) {
    analysis.total++;
    if (node.textStyleId && typeof node.textStyleId !== 'symbol' &&
        Object.values(designSystemTextStyles).includes(node.textStyleId)) {
        analysis.compliant++;
    }
    else {
        const violation = {
            nodeId: node.id,
            nodeName: node.name,
            issue: 'Non-compliant text style',
            currentValue: typeof node.textStyleId !== 'symbol' ? node.textStyleId : 'No style',
            expectedValue: 'Design System Text Style'
        };
        analysis.violations.push(violation);
    }
}
function analyzeEffectStyles(node, designSystemEffects, analysis) {
    if (!node.effects || typeof node.effects === 'symbol')
        return;
    const effects = node.effects;
    effects.forEach(() => {
        analysis.total++;
        if (node.effectStyleId &&
            typeof node.effectStyleId !== 'symbol' &&
            Object.values(designSystemEffects).includes(node.effectStyleId)) {
            analysis.compliant++;
        }
        else {
            const violation = {
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
function analyzeComponent(node, designSystemComponents, analysis) {
    var _a;
    analysis.total++;
    if (node.mainComponent &&
        Object.values(designSystemComponents).includes(node.mainComponent.id)) {
        analysis.compliant++;
    }
    else {
        const violation = {
            nodeId: node.id,
            nodeName: node.name,
            issue: 'Non-compliant component instance',
            currentValue: ((_a = node.mainComponent) === null || _a === void 0 ? void 0 : _a.id) || 'No main component',
            expectedValue: 'Design System Component'
        };
        analysis.violations.push(violation);
    }
}
//# sourceMappingURL=analyzer.js.map