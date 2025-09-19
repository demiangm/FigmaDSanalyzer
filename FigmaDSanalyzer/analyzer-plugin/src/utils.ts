import { StylesData } from './types';

export function isStyleInDesignSystem(
  styleId: string,
  styleType: 'colorStyles' | 'textStyles' | 'effectStyles',
  stylesData: StylesData[]
): boolean {
  if (!styleId) return false;
  
  const cleanStyleId = styleId.replace('S:', '').split(',')[0];
  
  return stylesData.some(data => {
    return Object.values(data[styleType] || {}).some(style => {
      const cleanDsStyleId = (style as string).replace(/^(Key:|S:)/, '');
      return cleanDsStyleId === cleanStyleId;
    });
  });
}

export async function getStyleName(styleId: string): Promise<string | undefined> {
  try {
    const style = await figma.getStyleByIdAsync(styleId);
    return style?.name;
  } catch (error) {
    console.error('Error getting style name:', error);
    return undefined;
  }
}

export function hasNonImageFills(node: SceneNode): boolean {
  try {
    if ('fills' in node) {
      const fills = (node as any).fills;
      if (Array.isArray(fills)) {
        return fills.some(fill => fill && fill.visible !== false && fill.type !== 'IMAGE');
      }
    }
  } catch (error) {
    console.error('Erro ao verificar fills não-imagem:', error);
  }
  return false;
}

export function hasStrokes(node: SceneNode): boolean {
  try {
    if ('strokes' in node) {
      const strokes = (node as any).strokes;
      if (Array.isArray(strokes)) {
        return strokes.some(stroke => stroke && stroke.visible !== false);
      }
    }
  } catch (error) {
    console.error('Erro ao verificar strokes:', error);
  }
  return false;
}

export function createEmptyDetails() {
  return {
    colors: [],
    fonts: [],
    effects: [],
    components: []
  };
}
