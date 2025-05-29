import React from 'react';
import styles from '../styles/AnalysisPanel.module.css';

interface AnalysisPanelProps {
  onStartAnalysis: () => void;
  isAnalyzing: boolean;
  error: string | null;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  onStartAnalysis,
  isAnalyzing,
  error
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.icon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 12l2 2 4-4"/>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
            <path d="M3 12h6m6 0h6"/>
          </svg>
        </div>
        <h2 className={styles.heroTitle}>Analyze Design System Compliance</h2>
        <p className={styles.heroDescription}>
          Select frames or components and run an analysis to check compliance with your design system standards.
        </p>
      </div>

      <div className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
              <path d="M21 12h-6M9 12H3"/>
            </svg>
          </div>
          <div>
            <h3 className={styles.featureTitle}>Color Validation</h3>
            <p className={styles.featureDescription}>
              Validates colors against your design system palette
            </p>
          </div>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </div>
          <div>
            <h3 className={styles.featureTitle}>Typography Check</h3>
            <p className={styles.featureDescription}>
              Ensures fonts match design system typography
            </p>
          </div>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <div>
            <h3 className={styles.featureTitle}>Component Analysis</h3>
            <p className={styles.featureDescription}>
              Calculates usage of design system components
            </p>
          </div>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v6"/>
              <path d="M12 18v4"/>
              <path d="M4.93 4.93l4.24 4.24"/>
              <path d="M14.83 14.83l4.24 4.24"/>
              <path d="M2 12h6"/>
              <path d="M16 12h6"/>
              <path d="M4.93 19.07l4.24-4.24"/>
              <path d="M14.83 9.17l4.24-4.24"/>
            </svg>
          </div>
          <div>
            <h3 className={styles.featureTitle}>Shadow Validation</h3>
            <p className={styles.featureDescription}>
              Checks shadows and effects against standards
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.analyzeButton}
          onClick={onStartAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              Start Analysis
            </>
          )}
        </button>
        
        <p className={styles.instruction}>
          Select one or more frames in Figma, then click "Start Analysis" to begin compliance checking.
        </p>
      </div>
    </div>
  );
};

export default AnalysisPanel;
