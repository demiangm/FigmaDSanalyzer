
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
  components: Record<string, { key: string }>;
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
  colors: {
    compliant: number;
    total: number;
    violations: Violation[];
  };
  fonts: {
    compliant: number;
    total: number;
    violations: Violation[];
  };
  shadows: {
    compliant: number;
    total: number;
    violations: Violation[];
  };
  components: {
    compliant: number;
    total: number;
    violations: Violation[];
  };
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
