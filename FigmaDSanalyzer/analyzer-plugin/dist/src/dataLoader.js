"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDataFiles = loadDataFiles;
// Importa dinamicamente todos os arquivos JSON da pasta data
async function loadDataFiles() {
    const components = [];
    const styles = [];
    // Lista de arquivos que serão importados dinamicamente
    // Isso será gerado pelo script de build
    try {
        // Importa arquivos de componentes (terminados com .components.json)
        const componentFiles = [
            '../data/Biblioteca-Part.1.components.json'
        ];
        for (const file of componentFiles) {
            try {
                const data = await Promise.resolve(`${file}`).then(s => __importStar(require(s)));
                components.push(data.default || data);
            }
            catch (error) {
                console.warn(`Erro ao carregar arquivo de componentes: ${file}`, error);
            }
        }
        // Importa arquivos de estilos (terminados com .styles.json)
        const styleFiles = [
            '../data/Design-Tokens.styles.json'
        ];
        for (const file of styleFiles) {
            try {
                const data = await Promise.resolve(`${file}`).then(s => __importStar(require(s)));
                styles.push(data.default || data);
            }
            catch (error) {
                console.warn(`Erro ao carregar arquivo de estilos: ${file}`, error);
            }
        }
    }
    catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
    return { components, styles };
}
