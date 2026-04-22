import { describe, it, expect } from 'vitest';
import { scrubUrl, scrubQueryString } from '../sentry';

describe('scrubUrl', () => {
  it('filters lowercase sensitive params', () => {
    expect(scrubUrl('https://x.com/a?token=abc')).toBe('https://x.com/a?token=%5BFiltered%5D');
  });

  it('filters uppercase sensitive params', () => {
    expect(scrubUrl('https://x.com/a?TOKEN=abc')).toBe('https://x.com/a?TOKEN=%5BFiltered%5D');
  });

  it('filters mixed-case sensitive params', () => {
    const result = scrubUrl('https://x.com/a?Password=abc&Api_Key=xyz');
    expect(result).toContain('Password=%5BFiltered%5D');
    expect(result).toContain('Api_Key=%5BFiltered%5D');
  });

  it('leaves non-sensitive params untouched', () => {
    expect(scrubUrl('https://x.com/a?page=2')).toBe('https://x.com/a?page=2');
  });

  it('preserves non-sensitive keys when mixed', () => {
    const result = scrubUrl('https://x.com/a?page=2&TOKEN=abc&sort=asc');
    expect(result).toContain('page=2');
    expect(result).toContain('sort=asc');
    expect(result).toContain('TOKEN=%5BFiltered%5D');
  });

  it('handles relative URLs', () => {
    expect(scrubUrl('/path?token=abc')).toContain('token=%5BFiltered%5D');
  });
});

describe('scrubQueryString', () => {
  it('filters lowercase params', () => {
    expect(scrubQueryString('token=abc')).toBe('token=%5BFiltered%5D');
  });

  it('filters uppercase params', () => {
    expect(scrubQueryString('TOKEN=abc')).toBe('TOKEN=%5BFiltered%5D');
  });

  it('filters mixed-case params', () => {
    const result = scrubQueryString('Password=abc&Api_Key=xyz');
    expect(result).toContain('Password=%5BFiltered%5D');
    expect(result).toContain('Api_Key=%5BFiltered%5D');
  });

  it('preserves leading ? when present', () => {
    expect(scrubQueryString('?token=abc')).toBe('?token=%5BFiltered%5D');
  });

  it('handles no leading ?', () => {
    expect(scrubQueryString('token=abc')).toBe('token=%5BFiltered%5D');
  });

  it('leaves non-sensitive params untouched', () => {
    expect(scrubQueryString('page=2')).toBe('page=2');
  });
});