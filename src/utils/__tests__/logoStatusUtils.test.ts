import { describe, expect, it } from 'vitest';

import {
  getLogoStatus,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
} from '../logoStatusUtils';

describe('getLogoStatus', () => {
  it('returns missing for null', () => {
    expect(getLogoStatus(null)).toBe('missing');
  });

  it('returns missing for undefined', () => {
    expect(getLogoStatus(undefined)).toBe('missing');
  });

  it('returns missing for empty string', () => {
    expect(getLogoStatus('')).toBe('missing');
  });

  it('returns optimized for a WebP in the /teams/teams/ path', () => {
    expect(getLogoStatus('https://example.com/teams/teams/abc/logo.webp')).toBe('optimized');
  });

  it('returns legacy for a non-WebP URL', () => {
    expect(getLogoStatus('https://example.com/teams/logo.png')).toBe('legacy');
  });

  it('returns legacy for a WebP outside /teams/teams/ path', () => {
    expect(getLogoStatus('https://example.com/other/logo.webp')).toBe('legacy');
  });
});

describe('getStatusColor', () => {
  it('returns green for optimized', () => {
    expect(getStatusColor('optimized')).toBe('text-green-500');
  });

  it('returns yellow for legacy', () => {
    expect(getStatusColor('legacy')).toBe('text-yellow-500');
  });

  it('returns red for missing', () => {
    expect(getStatusColor('missing')).toBe('text-red-500');
  });
});

describe('getStatusLabel', () => {
  it('returns Optimized', () => expect(getStatusLabel('optimized')).toBe('Optimized'));
  it('returns Needs Update', () => expect(getStatusLabel('legacy')).toBe('Needs Update'));
  it('returns Missing', () => expect(getStatusLabel('missing')).toBe('Missing'));
});

describe('getStatusIcon', () => {
  it('returns green circle for optimized', () => expect(getStatusIcon('optimized')).toBe('🟢'));
  it('returns yellow circle for legacy', () => expect(getStatusIcon('legacy')).toBe('🟡'));
  it('returns red circle for missing', () => expect(getStatusIcon('missing')).toBe('🔴'));
});
