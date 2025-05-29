import React, { useState, useEffect } from 'react';
import { DesignSystemConfig, FontConfig, ShadowConfig } from '../types';
import { getDefaultDesignSystem } from '../designSystem';
import styles from '../styles/ConfigPanel.module.css';

interface ConfigPanelProps {
  designSystem: DesignSystemConfig | null;
  onUpdateDesignSystem: (config: DesignSystemConfig) => void;
  onBack: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({
  designSystem,
  onUpdateDesignSystem,
  onBack
}) => {
  const [config, setConfig] = useState<DesignSystemConfig>(
    designSystem || getDefaultDesignSystem()
  );
  const [newColor, setNewColor] = useState('');
  const [newFont, setNewFont] = useState({ family: '', weights: '400' });
  const [newShadow, setNewShadow] = useState({
    name: '',
    blur: 0,
    offsetX: 0,
    offsetY: 0,
    color: '#000000'
  });
  const [newPrefix, setNewPrefix] = useState('');

  useEffect(() => {
    if (designSystem) {
      setConfig(designSystem);
    }
  }, [designSystem]);

  const handleSave = () => {
    onUpdateDesignSystem(config);
    onBack();
  };

  const addColor = () => {
    if (newColor && !config.colors.includes(newColor)) {
      setConfig({
        ...config,
        colors: [...config.colors, newColor]
      });
      setNewColor('');
    }
  };

  const removeColor = (color: string) => {
    setConfig({
      ...config,
      colors: config.colors.filter(c => c !== color)
    });
  };

  const addFont = () => {
    if (newFont.family && newFont.weights) {
      const weights = newFont.weights.split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w));
      if (weights.length > 0) {
        setConfig({
          ...config,
          fonts: [...config.fonts, { family: newFont.family, weights }]
        });
        setNewFont({ family: '', weights: '400' });
      }
    }
  };

  const removeFont = (index: number) => {
    setConfig({
      ...config,
      fonts: config.fonts.filter((_, i) => i !== index)
    });
  };

  const addShadow = () => {
    if (newShadow.name) {
      setConfig({
        ...config,
        shadows: [...config.shadows, newShadow]
      });
      setNewShadow({
        name: '',
        blur: 0,
        offsetX: 0,
        offsetY: 0,
        color: '#000000'
      });
    }
  };

  const removeShadow = (index: number) => {
    setConfig({
      ...config,
      shadows: config.shadows.filter((_, i) => i !== index)
    });
  };

  const addPrefix = () => {
    if (newPrefix && !config.componentPrefixes.includes(newPrefix)) {
      setConfig({
        ...config,
        componentPrefixes: [...config.componentPrefixes, newPrefix]
      });
      setNewPrefix('');
    }
  };

  const removePrefix = (prefix: string) => {
    setConfig({
      ...config,
      componentPrefixes: config.componentPrefixes.filter(p => p !== prefix)
    });
  };

  const resetToDefaults = () => {
    setConfig(getDefaultDesignSystem());
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Back
        </button>
        <h2 className={styles.title}>Design System Configuration</h2>
      </div>

      <div className={styles.sections}>
        {/* Colors Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Colors</h3>
          <div className={styles.inputGroup}>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className={styles.colorInput}
            />
            <input
              type="text"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              placeholder="#000000"
              className={styles.textInput}
            />
            <button onClick={addColor} className={styles.addButton}>Add</button>
          </div>
          <div className={styles.itemList}>
            {config.colors.map((color, index) => (
              <div key={index} className={styles.colorItem}>
                <div 
                  className={styles.colorSwatch} 
                  style={{ backgroundColor: color }}
                />
                <span className={styles.colorValue}>{color}</span>
                <button 
                  onClick={() => removeColor(color)}
                  className={styles.removeButton}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Fonts Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Fonts</h3>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={newFont.family}
              onChange={(e) => setNewFont({ ...newFont, family: e.target.value })}
              placeholder="Font family"
              className={styles.textInput}
            />
            <input
              type="text"
              value={newFont.weights}
              onChange={(e) => setNewFont({ ...newFont, weights: e.target.value })}
              placeholder="400,500,600"
              className={styles.textInput}
            />
            <button onClick={addFont} className={styles.addButton}>Add</button>
          </div>
          <div className={styles.itemList}>
            {config.fonts.map((font, index) => (
              <div key={index} className={styles.fontItem}>
                <span className={styles.fontFamily}>{font.family}</span>
                <span className={styles.fontWeights}>{font.weights.join(', ')}</span>
                <button 
                  onClick={() => removeFont(index)}
                  className={styles.removeButton}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Shadows Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Shadows</h3>
          <div className={styles.shadowInputs}>
            <input
              type="text"
              value={newShadow.name}
              onChange={(e) => setNewShadow({ ...newShadow, name: e.target.value })}
              placeholder="Shadow name"
              className={styles.textInput}
            />
            <div className={styles.shadowParams}>
              <input
                type="number"
                value={newShadow.blur}
                onChange={(e) => setNewShadow({ ...newShadow, blur: parseInt(e.target.value) || 0 })}
                placeholder="Blur"
                className={styles.numberInput}
              />
              <input
                type="number"
                value={newShadow.offsetX}
                onChange={(e) => setNewShadow({ ...newShadow, offsetX: parseInt(e.target.value) || 0 })}
                placeholder="X"
                className={styles.numberInput}
              />
              <input
                type="number"
                value={newShadow.offsetY}
                onChange={(e) => setNewShadow({ ...newShadow, offsetY: parseInt(e.target.value) || 0 })}
                placeholder="Y"
                className={styles.numberInput}
              />
              <input
                type="color"
                value={newShadow.color}
                onChange={(e) => setNewShadow({ ...newShadow, color: e.target.value })}
                className={styles.colorInput}
              />
            </div>
            <button onClick={addShadow} className={styles.addButton}>Add</button>
          </div>
          <div className={styles.itemList}>
            {config.shadows.map((shadow, index) => (
              <div key={index} className={styles.shadowItem}>
                <span className={styles.shadowName}>{shadow.name}</span>
                <span className={styles.shadowDetails}>
                  blur: {shadow.blur}px, offset: {shadow.offsetX},{shadow.offsetY}
                </span>
                <button 
                  onClick={() => removeShadow(index)}
                  className={styles.removeButton}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Component Prefixes Section */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Component Prefixes</h3>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={newPrefix}
              onChange={(e) => setNewPrefix(e.target.value)}
              placeholder="DS/"
              className={styles.textInput}
            />
            <button onClick={addPrefix} className={styles.addButton}>Add</button>
          </div>
          <div className={styles.itemList}>
            {config.componentPrefixes.map((prefix, index) => (
              <div key={index} className={styles.prefixItem}>
                <span className={styles.prefixValue}>{prefix}</span>
                <button 
                  onClick={() => removePrefix(prefix)}
                  className={styles.removeButton}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.actions}>
        <button onClick={resetToDefaults} className={styles.resetButton}>
          Reset to Defaults
        </button>
        <button onClick={handleSave} className={styles.saveButton}>
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
