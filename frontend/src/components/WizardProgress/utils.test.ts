import { DEFAULT_LANGUAGE } from '@konnekt/rules/language';
import { describe, expect, it } from 'vitest';

import { CONNECTION_STEP_LABELS, CONNECTION_STEPS } from '../../constants';
import { hasStepLine, nextLabelOf, stepCountOf, stepStateOf } from './utils';

// FR-025: four steps (Connection, Documents, Rules, Test); Publish is a dialog, not a step
describe('the step line (FR-025)', () => {
  // The steps' English names, in step order (spec 009: the steps are keys, their names a table)
  const stepNames = CONNECTION_STEPS.map((step) => CONNECTION_STEP_LABELS[DEFAULT_LANGUAGE][step]);

  it('has the four steps', () => {
    expect(CONNECTION_STEPS).toEqual(['connection', 'documents', 'rules', 'test']);
    expect(stepNames).toEqual(['Connection', 'Documents', 'Rules', 'Test']);
  });

  it('marks the steps before the current one done and the ones after it to do', () => {
    const statesOf = (current: number) =>
      CONNECTION_STEPS.map((_, index) => stepStateOf(index, current));
    expect(statesOf(0)).toEqual(['current', 'todo', 'todo', 'todo']);
    expect(statesOf(2)).toEqual(['done', 'done', 'current', 'todo']);
    expect(statesOf(3)).toEqual(['done', 'done', 'done', 'current']);
  });

  it('counts the steps as "Step n of 4"', () => {
    expect(stepCountOf(0, CONNECTION_STEPS.length, 'en')).toBe('Step 1 of 4');
    expect(stepCountOf(3, CONNECTION_STEPS.length, 'en')).toBe('Step 4 of 4');
  });

  it('names the next step, and the last step as "Last step"', () => {
    expect(nextLabelOf(stepNames, 0, 'en')).toBe('Next: Documents');
    expect(nextLabelOf(stepNames, 1, 'en')).toBe('Next: Rules');
    expect(nextLabelOf(stepNames, 2, 'en')).toBe('Next: Test');
    expect(nextLabelOf(stepNames, 3, 'en')).toBe('Last step');
  });

  it('says the step line in German (spec 009)', () => {
    const germanNames = CONNECTION_STEPS.map((step) => CONNECTION_STEP_LABELS.de[step]);
    expect(stepCountOf(1, CONNECTION_STEPS.length, 'de')).toBe('Schritt 2 von 4');
    expect(nextLabelOf(germanNames, 0, 'de')).toBe('Weiter: Dokumente');
    expect(nextLabelOf(germanNames, 3, 'de')).toBe('Letzter Schritt');
  });

  it('shows no step line past the last step (the details)', () => {
    expect(hasStepLine(0, CONNECTION_STEPS.length)).toBe(true);
    expect(hasStepLine(3, CONNECTION_STEPS.length)).toBe(true);
    expect(hasStepLine(4, CONNECTION_STEPS.length)).toBe(false);
    expect(hasStepLine(-1, CONNECTION_STEPS.length)).toBe(false);
  });
});
