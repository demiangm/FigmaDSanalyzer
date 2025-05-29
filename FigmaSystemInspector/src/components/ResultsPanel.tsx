import React, { useState } from 'react';
import { ComplianceReport, ComplianceViolation } from '../types';
import { formatPercentage, getComplianceColor } from '../utils';
import styles from '../styles/ResultsPanel.module.css';

interface ResultsPanelProps {
  reports: ComplianceReport[];
  onBack: () => void;
  onNewAnalysis: () => void;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  reports,
  onBack,
  onNewAnalysis
}) => {
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(
    reports.length > 0 ? reports[0] : null
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'violations'>('overview');

  if (reports.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
            Back
          </button>
          <h2 className={styles.title}>No Results</h2>
        </div>
        <div className={styles.emptyState}>
          <p>No analysis results available. Run an analysis first.</p>
          <button onClick={onNewAnalysis} className={styles.analyzeButton}>
            Start New Analysis
          </button>
        </div>
      </div>
    );
  }

  const calculateOverallCompliance = () => {
    if (reports.length === 0) return 0;
    const total = reports.reduce((sum, report) => sum + report.overallCompliance, 0);
    return Math.round(total / reports.length);
  };

  const getAllViolations = (category: keyof ComplianceReport['analysis']) => {
    if (!selectedReport) return [];
    return selectedReport.analysis[category].violations;
  };

  const renderComplianceScore = (score: number, label: string) => (
    <div className={styles.scoreCard}>
      <div 
        className={styles.scoreCircle}
        style={{ 
          background: `conic-gradient(${getComplianceColor(score)} ${score}%, #e5e5e5 ${score}%)` 
        }}
      >
        <span className={styles.scoreValue}>{score}%</span>
      </div>
      <span className={styles.scoreLabel}>{label}</span>
    </div>
  );

  const renderViolations = (violations: ComplianceViolation[], category: string) => (
    <div className={styles.violationsSection}>
      <h4 className={styles.violationsTitle}>
        {category} ({violations.length} issues)
      </h4>
      {violations.length === 0 ? (
        <p className={styles.noViolations}>No violations found</p>
      ) : (
        <div className={styles.violationsList}>
          {violations.map((violation, index) => (
            <div key={index} className={styles.violation}>
              <div className={styles.violationHeader}>
                <span className={styles.violationNode}>{violation.nodeName}</span>
                <span className={styles.violationIssue}>{violation.issue}</span>
              </div>
              <div className={styles.violationDetails}>
                <div className={styles.violationValue}>
                  <span className={styles.label}>Current:</span>
                  <span className={styles.current}>{violation.currentValue}</span>
                </div>
                <div className={styles.violationValue}>
                  <span className={styles.label}>Expected:</span>
                  <span className={styles.expected}>{violation.expectedValue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Back
        </button>
        <h2 className={styles.title}>Analysis Results</h2>
        <button onClick={onNewAnalysis} className={styles.newAnalysisButton}>
          New Analysis
        </button>
      </div>

      <div className={styles.summary}>
        <div className={styles.overallScore}>
          {renderComplianceScore(calculateOverallCompliance(), 'Overall Compliance')}
        </div>
        <div className={styles.summaryStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{reports.length}</span>
            <span className={styles.statLabel}>Frames Analyzed</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {reports.reduce((sum, r) => sum + r.analysis.colors.violations.length, 0) +
               reports.reduce((sum, r) => sum + r.analysis.fonts.violations.length, 0) +
               reports.reduce((sum, r) => sum + r.analysis.shadows.violations.length, 0) +
               reports.reduce((sum, r) => sum + r.analysis.components.violations.length, 0)}
            </span>
            <span className={styles.statLabel}>Total Issues</span>
          </div>
        </div>
      </div>

      {reports.length > 1 && (
        <div className={styles.frameSelector}>
          <h3 className={styles.frameSelectorTitle}>Select Frame:</h3>
          <div className={styles.frameList}>
            {reports.map((report) => (
              <button
                key={report.frameId}
                className={`${styles.frameButton} ${selectedReport?.frameId === report.frameId ? styles.active : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <span className={styles.frameName}>{report.frameName}</span>
                <span 
                  className={styles.frameScore}
                  style={{ color: getComplianceColor(report.overallCompliance) }}
                >
                  {report.overallCompliance}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedReport && (
        <div className={styles.reportDetails}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'violations' ? styles.active : ''}`}
              onClick={() => setActiveTab('violations')}
            >
              Violations
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className={styles.overview}>
              <h3 className={styles.frameTitle}>{selectedReport.frameName}</h3>
              <div className={styles.categoryScores}>
                {renderComplianceScore(selectedReport.colorCompliance, 'Colors')}
                {renderComplianceScore(selectedReport.fontCompliance, 'Fonts')}
                {renderComplianceScore(selectedReport.shadowCompliance, 'Shadows')}
                {renderComplianceScore(selectedReport.componentCompliance, 'Components')}
              </div>

              <div className={styles.breakdown}>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Colors</span>
                  <span className={styles.breakdownValue}>
                    {selectedReport.analysis.colors.compliant}/{selectedReport.analysis.colors.total}
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Fonts</span>
                  <span className={styles.breakdownValue}>
                    {selectedReport.analysis.fonts.compliant}/{selectedReport.analysis.fonts.total}
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Shadows</span>
                  <span className={styles.breakdownValue}>
                    {selectedReport.analysis.shadows.compliant}/{selectedReport.analysis.shadows.total}
                  </span>
                </div>
                <div className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>Components</span>
                  <span className={styles.breakdownValue}>
                    {selectedReport.analysis.components.compliant}/{selectedReport.analysis.components.total}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'violations' && (
            <div className={styles.violations}>
              {renderViolations(getAllViolations('colors'), 'Colors')}
              {renderViolations(getAllViolations('fonts'), 'Fonts')}
              {renderViolations(getAllViolations('shadows'), 'Shadows')}
              {renderViolations(getAllViolations('components'), 'Components')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResultsPanel;
