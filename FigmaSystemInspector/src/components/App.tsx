import React, { useState, useEffect } from 'react';
import { ComplianceReport, DesignSystemConfig, PluginMessage } from '../types';
import AnalysisPanel from './AnalysisPanel';
import ConfigPanel from './ConfigPanel';
import ResultsPanel from './ResultsPanel';
import styles from '../styles/App.module.css';

enum AppView {
  ANALYSIS = 'analysis',
  CONFIG = 'config',
  RESULTS = 'results'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.ANALYSIS);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [designSystem, setDesignSystem] = useState<DesignSystemConfig | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Request design system configuration on mount
    parent.postMessage({ pluginMessage: { type: 'get-design-system' } }, '*');

    // Listen for messages from the plugin
    const handleMessage = (event: MessageEvent) => {
      const message: PluginMessage = event.data.pluginMessage;
      
      switch (message.type) {
        case 'design-system-loaded':
          setDesignSystem(message.config);
          break;
          
        case 'analysis-complete':
          setReports(message.reports);
          setIsAnalyzing(false);
          setCurrentView(AppView.RESULTS);
          setError(null);
          break;
          
        case 'analysis-error':
          setError(message.message);
          setIsAnalyzing(false);
          break;
          
        case 'plugin-initialized':
          console.log('Plugin initialized');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setError(null);
    parent.postMessage({ pluginMessage: { type: 'analyze-selection' } }, '*');
  };

  const handleUpdateDesignSystem = (config: DesignSystemConfig) => {
    setDesignSystem(config);
    parent.postMessage({ 
      pluginMessage: { 
        type: 'update-design-system', 
        config 
      } 
    }, '*');
  };

  const handleClosePlugin = () => {
    parent.postMessage({ pluginMessage: { type: 'close-plugin' } }, '*');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case AppView.ANALYSIS:
        return (
          <AnalysisPanel
            onStartAnalysis={handleStartAnalysis}
            isAnalyzing={isAnalyzing}
            error={error}
          />
        );
        
      case AppView.CONFIG:
        return (
          <ConfigPanel
            designSystem={designSystem}
            onUpdateDesignSystem={handleUpdateDesignSystem}
            onBack={() => setCurrentView(AppView.ANALYSIS)}
          />
        );
        
      case AppView.RESULTS:
        return (
          <ResultsPanel
            reports={reports}
            onBack={() => setCurrentView(AppView.ANALYSIS)}
            onNewAnalysis={handleStartAnalysis}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Design System Compliance</h1>
        <div className={styles.nav}>
          <button
            className={`${styles.navButton} ${currentView === AppView.ANALYSIS ? styles.active : ''}`}
            onClick={() => setCurrentView(AppView.ANALYSIS)}
          >
            Analyze
          </button>
          <button
            className={`${styles.navButton} ${currentView === AppView.CONFIG ? styles.active : ''}`}
            onClick={() => setCurrentView(AppView.CONFIG)}
          >
            Config
          </button>
          {reports.length > 0 && (
            <button
              className={`${styles.navButton} ${currentView === AppView.RESULTS ? styles.active : ''}`}
              onClick={() => setCurrentView(AppView.RESULTS)}
            >
              Results
            </button>
          )}
        </div>
        <button className={styles.closeButton} onClick={handleClosePlugin}>
          ×
        </button>
      </header>
      
      <main className={styles.main}>
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default App;
