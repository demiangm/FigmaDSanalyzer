export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const componentToHex = (c: number) => {
    const hex = Math.round(c).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function isSimilarColor(color1: string, color2: string, threshold: number = 10): boolean {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return false;
  
  const distance = Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
  
  return distance <= threshold;
}

export function extractTextStyles(textNode: TextNode): Array<{
  fontFamily: string;
  fontWeight: number;
}> {
  const styles: Array<{ fontFamily: string; fontWeight: number }> = [];
  
  if (typeof textNode.fontName === 'object' && 'family' in textNode.fontName) {
    // Single text style
    styles.push({
      fontFamily: textNode.fontName.family,
      fontWeight: 400 // Default weight
    });
  }
  
  return styles;
}

export function extractEffects(node: SceneNode): Array<{
  blur: number;
  offsetX: number;
  offsetY: number;
  color: string;
}> {
  const effects: Array<{
    blur: number;
    offsetX: number;
    offsetY: number;
    color: string;
  }> = [];
  
  if (!('effects' in node) || !node.effects) return effects;
  
  for (const effect of node.effects) {
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      const color = effect.color ? 
        rgbToHex(effect.color.r * 255, effect.color.g * 255, effect.color.b * 255) : 
        '#000000';
        
      effects.push({
        blur: effect.radius || 0,
        offsetX: effect.offset?.x || 0,
        offsetY: effect.offset?.y || 0,
        color
      });
    }
  }
  
  return effects;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function getComplianceColor(percentage: number): string {
  if (percentage >= 90) return '#28CD41';
  if (percentage >= 70) return '#FFCC02';
  return '#FF3B30';
}
