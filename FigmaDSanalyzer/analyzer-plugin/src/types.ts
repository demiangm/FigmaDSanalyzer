export interface DesignSystemConfig {
  colors: string[];
  fonts: FontConfig[];
  shadows: ShadowConfig[];
  componentPrefixes: string[];
}

export interface FontConfig {
  family: string;
  weights: number[];
}

export interface ShadowConfig {
  name: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  color: string;
}

export interface ComponentData {
  metadata: {
    extractedAt: string;
    fileName: string;
  };
  components: Record<string, { 
    key: string;
    isHidden?: boolean;
  }>;
}

export interface StylesData {
  metadata: {
    extractedAt: string;
    fileName: string;
  };
  colorStyles: Record<string, string>;
  textStyles: Record<string, string>;
  effectStyles: Record<string, string>;
}

export interface Violation {
  nodeId: string;
  nodeName: string;
  issue: string;
  currentValue: string;
  expectedValue: string;
}

export interface AnalysisResult {
  nonCompliantColors: number;
  nonCompliantFonts: number;
  nonCompliantEffects: number;
  nonDsComponents: number;
  totalLayers: number;
  dsComponentsUsed: number;
  hiddenComponentsUsed: number;
  details: NonCompliantDetails;
}

export interface StyleIssue {
  nodeId: string;
  nodeName: string;
  styleId?: string;
  currentStyle?: string;
  originalStyle?: string;
  type: 'changed' | 'missing' | 'invalid' | 'outdated';
  reason: string;
  value?: string; // Para cores hex, nomes de fonte, etc
  frameName?: string; // Nome do frame onde o issue ocorre
  componentName?: string; // Nome do componente para agrupamento
}

export interface NonCompliantDetails {
  colors: StyleIssue[];
  fonts: StyleIssue[];
  effects: StyleIssue[];
  components: StyleIssue[];
}

export interface ComplianceReport {
  frameName: string;
  frameId: string;
  totalLayers: number;
  dsComponentsUsed: number;
  hiddenComponentsUsed: number;
  coveragePercentage: number;
  coverageLevel: { emoji: string; label: string };
  nonCompliantItems: {
    colors: number;
    fonts: number;
    effects: number;
    components: number;
    details: NonCompliantDetails;
  };
}
