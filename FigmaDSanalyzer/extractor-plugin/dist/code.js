"use strict";
// Plugin para extrair chaves de componentes e estilos das bibliotecas do design system
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const pluginInitialWidth = 520;
figma.showUI(__html__, { width: pluginInitialWidth, height: 480 }); // A altura inicial pode ser um padrão ou mínima
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    switch (msg.type) {
        case 'extract-data':
            try {
                yield extractDesignSystemData();
            }
            catch (error) {
                figma.ui.postMessage({
                    type: 'extraction-error',
                    message: error instanceof Error ? error.message : 'Erro ao extrair dados'
                });
            }
            break;
        case 'close':
            figma.closePlugin();
            break;
        case 'resize-plugin-window': // Novo tipo de mensagem vindo da UI
            if (msg.height && typeof msg.height === 'number' && msg.height > 0) {
                // Você pode querer adicionar validações para altura mínima/máxima aqui
                figma.ui.resize(pluginInitialWidth, msg.height);
            }
            break;
    }
});
function extractDesignSystemData() {
    return __awaiter(this, void 0, void 0, function* () {
        const componentsFile = {
            metadata: {
                extractedAt: new Date().toISOString(),
                fileName: figma.root.name
            },
            components: {}
        };
        const stylesFile = {
            metadata: {
                extractedAt: new Date().toISOString(),
                fileName: figma.root.name
            },
            colorStyles: {},
            textStyles: {},
            effectStyles: {}
        };
        // Função para verificar se um componente é oculto
        const isHiddenComponent = (name) => name.startsWith('.') || name.startsWith('_');
        const componentEntries = {};
        // Encontra todos os componentes, incluindo os ocultos
        const components = figma.root.findAll(node => {
            var _a;
            return node.type === 'COMPONENT' &&
                ((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type) !== 'COMPONENT_SET';
        });
        const componentSets = figma.root.findAll(node => node.type === 'COMPONENT_SET');
        // Adiciona componentes independentes
        for (const component of components) {
            componentEntries[component.name] = {
                key: component.key,
                isHidden: isHiddenComponent(component.name)
            };
        }
        // Adiciona component sets
        for (const set of componentSets) {
            componentEntries[set.name] = {
                key: set.key,
                isHidden: isHiddenComponent(set.name)
            };
        }
        componentsFile.components = componentEntries;
        // Extrai estilos
        for (const style of figma.getLocalPaintStyles()) {
            stylesFile.colorStyles[style.name] = `Key:${style.key}`;
        }
        for (const style of figma.getLocalTextStyles()) {
            const cleanId = style.id.replace(/,+$/, '');
            console.log(`TextStyle: ${style.name} => "${cleanId}"`);
            stylesFile.textStyles[style.name] = cleanId;
        }
        for (const style of figma.getLocalEffectStyles()) {
            const cleanId = style.id.trim().replace(/,+$/, '');
            console.log(`EffectStyle: ${style.name} => "${cleanId}"`);
            stylesFile.effectStyles[style.name] = cleanId;
        }
        const baseFileName = figma.root.name.trim().replace(/\s+/g, '-');
        figma.ui.postMessage({
            type: 'extraction-complete',
            componentsFile,
            stylesFile,
            fileNames: {
                components: `${baseFileName}.components.json`,
                styles: `${baseFileName}.styles.json`
            },
            summary: {
                components: Object.keys(componentsFile.components).length,
                colorStyles: Object.keys(stylesFile.colorStyles).length,
                textStyles: Object.keys(stylesFile.textStyles).length,
                effectStyles: Object.keys(stylesFile.effectStyles).length
            }
        });
    });
}
