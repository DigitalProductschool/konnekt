import type { Combinator } from '../../types/form-connections';

// Figma "Rules/Connector": the pill's label
export const CONNECTOR_LABELS: Record<Combinator, string> = { and: 'AND', or: 'OR' };

// Figma "Rules/Connector menu" (U14 6094:7052), in the order it lists the operators
export const CONNECTOR_OPTIONS: { operator: Combinator; description: string }[] = [
  { operator: 'and', description: 'All rules must be true' },
  { operator: 'or', description: 'At least one rule must be true' },
];

export const CONNECTOR_COPY = {
  // Read after the pill's label, so that the button's name says which level it switches
  switchLevel: (level: string) => `, switch ${level} to AND or OR`,
  // The menu's footer
  appliesTo: (level: string) => `Applies to every rule in ${level}`,
};
