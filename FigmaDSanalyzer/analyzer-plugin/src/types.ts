// Analysis result types
export interface ViolationInfo {
  nodeId: string;
  nodeName: string;
  issue: string;
  currentValue: string;
  expectedValue: string;
}

export interface AnalysisMetric {
  compliant: number;
  total: number;
  violations: ViolationInfo[];
}

export interface AnalysisResult {
  colors: AnalysisMetric;
  fonts: AnalysisMetric;
  shadows: AnalysisMetric;
  components: AnalysisMetric;
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

// Design system configuration types
export interface DesignSystemConfig {
  components: Record<string, string>;
  styles: {
    colors: Record<string, string>;
    text: Record<string, string>;
    effects: Record<string, string>;
  };
}