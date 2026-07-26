import { describe, expect, it } from 'vitest';
import { titleCase } from './format.ts';

describe('titleCase', () => {
  it('capitalizes each word of enum-like labels', () => {
    expect(titleCase('ACTIVE')).toBe('Active');
    expect(titleCase('DECOMMISSIONED')).toBe('Decommissioned');
    expect(titleCase('COLLAR_V1')).toBe('Collar V1');
    expect(titleCase('ENTER')).toBe('Enter');
  });

  it('handles empty input', () => {
    expect(titleCase('')).toBe('');
  });
});
