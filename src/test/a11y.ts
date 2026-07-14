import { expect } from 'vitest';
import { axe } from 'vitest-axe';

const wcag2AAndAaRules = ['wcag2a', 'wcag2aa'];

export const expectNoAxeViolations = async (container: Element): Promise<void> => {
  const results = await axe(container, {
    runOnly: {
      type: 'tag',
      values: wcag2AAndAaRules,
    },
  });

  expect(results.violations).toEqual([]);
};
