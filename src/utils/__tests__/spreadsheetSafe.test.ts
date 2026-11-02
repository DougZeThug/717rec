import { describe, expect, it } from 'vitest';

import { neutralizeFormula } from '@/utils/spreadsheetSafe';

describe('neutralizeFormula', () => {
  it.each([
    ['=SUM(A1)', "'=SUM(A1)"],
    ['+1', "'+1"],
    ['-1', "'-1"],
    ['@user', "'@user"],
    ['\ttabbed', "'\ttabbed"],
    ['\rreturn', "'\rreturn"],
  ])('adds a leading apostrophe to %j', (input, expected) => {
    expect(neutralizeFormula(input)).toBe(expected);
  });

  it.each(['Team A', '', 'a=b', ' =x'])('leaves %j unchanged', (input) => {
    expect(neutralizeFormula(input)).toBe(input);
  });

  it.each([-5, 0, 3.14])('leaves the number %s unchanged', (input) => {
    const result = neutralizeFormula(input);
    expect(result).toBe(input);
    expect(typeof result).toBe('number');
  });

  it('leaves text that already starts with an apostrophe unchanged', () => {
    expect(neutralizeFormula("'=x")).toBe("'=x");
  });
});
