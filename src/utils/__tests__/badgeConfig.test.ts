import { describe, expect, it } from 'vitest';

import { BadgeType } from '@/types/badges';

import { badgeConfigs, getBadgeConfig, getBadgesByCategory } from '../badgeConfig';

const ALL_BADGE_TYPES = Object.keys(badgeConfigs) as BadgeType[];

describe('badgeConfigs', () => {
  it('defines all badge types with required fields', () => {
    for (const type of ALL_BADGE_TYPES) {
      const config = badgeConfigs[type];
      expect(config.type).toBe(type);
      expect(typeof config.name).toBe('string');
      expect(typeof config.description).toBe('string');
      expect(config.icon).toBeDefined();
      expect(typeof config.gradient).toBe('string');
      expect(typeof config.bgColor).toBe('string');
      expect(typeof config.textColor).toBe('string');
      expect(typeof config.category).toBe('string');
    }
  });
});

describe('getBadgeConfig', () => {
  it('returns the base config for a championship badge', () => {
    const config = getBadgeConfig('recreational_champion');
    expect(config.name).toBe('Recreational Champion');
    expect(config.category).toBe('championship');
  });

  it('returns cyan variant for intermediate_champion with High division metadata', () => {
    const config = getBadgeConfig('intermediate_champion', {
      badge_type: 'intermediate_champion',
      metadata: { division: 'Intermediate High' },
    } as any);
    expect(config.name).toBe('Intermediate High Champion');
    expect(config.gradient).toContain('cyan');
  });

  it('returns base config for intermediate_champion without metadata', () => {
    const config = getBadgeConfig('intermediate_champion');
    expect(config.name).toBe('Intermediate Champion');
  });

  it('returns correct config for performance badge', () => {
    const config = getBadgeConfig('clutch_performer');
    expect(config.category).toBe('performance');
    expect(config.isPermanent).toBe(false);
  });
});

describe('getBadgesByCategory', () => {
  it('returns only championship badges', () => {
    const badges = getBadgesByCategory('championship');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => expect(b.category).toBe('championship'));
  });

  it('returns only streak badges', () => {
    const badges = getBadgesByCategory('streak');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => expect(b.category).toBe('streak'));
  });

  it('returns only performance badges', () => {
    const badges = getBadgesByCategory('performance');
    expect(badges.length).toBeGreaterThan(0);
    badges.forEach((b) => expect(b.category).toBe('performance'));
  });
});
