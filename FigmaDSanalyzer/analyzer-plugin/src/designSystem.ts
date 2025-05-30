import { DesignSystemConfig } from './types';

export function getDefaultDesignSystem(): DesignSystemConfig {
  return {
    components: {},
    styles: {
      colors: {},
      text: {},
      effects: {}
    }
  };
}