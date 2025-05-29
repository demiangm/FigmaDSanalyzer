import { DesignSystemConfig } from './types';

export function getDefaultDesignSystem(): DesignSystemConfig {
  return {
    colors: [
      '#000000', '#FFFFFF', '#F5F5F5', '#E5E5E5',
      '#007AFF', '#5856D6', '#AF52DE', '#FF2D92',
      '#FF3B30', '#FF9500', '#FFCC02', '#30B0C7',
      '#28CD41', '#55BEF0', '#007AFF', '#5AC8FA'
    ],
    fonts: [
      { family: 'Inter', weights: [400, 500, 600, 700] },
      { family: 'SF Pro Display', weights: [400, 500, 600, 700] },
      { family: 'Roboto', weights: [300, 400, 500, 700] }
    ],
    shadows: [
      {
        name: 'Small',
        blur: 4,
        offsetX: 0,
        offsetY: 2,
        color: '#00000025'
      },
      {
        name: 'Medium',
        blur: 8,
        offsetX: 0,
        offsetY: 4,
        color: '#00000025'
      },
      {
        name: 'Large',
        blur: 16,
        offsetX: 0,
        offsetY: 8,
        color: '#00000025'
      }
    ],
    componentPrefixes: ['DS/', 'Component/', 'UI/']
  };
}
