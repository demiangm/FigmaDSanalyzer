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
  spread?: number;
}

export interface ComplianceViolation {
  nodeId: string;
  nodeName: string;
  issue: string;
  currentValue: string;
  expectedValue: string;
}

export interface ComplianceCategory {
  compliant: number;
  total: number;
  violations: ComplianceViolation[];
}

export interface AnalysisResult {
  colors: ComplianceCategory;
  fonts: ComplianceCategory;
  shadows: ComplianceCategory;
  components: ComplianceCategory;
}

export interface ComplianceReport {
  frameName: string;
  frameId: string;
  overallCompliance: number;
  colorCompliance: number;
  fontCompliance: number;
  shadowCompliance: number;
  componentCompliance: number;
  analysis: AnalysisResult;
}

export interface PluginMessage {
  type: string;
  [key: string]: any;
}
