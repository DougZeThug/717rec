import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../AnnouncementHeroCard', () => ({ default: () => <div>announcement-card</div> }));
vi.mock('../ChampionsHeroCard', () => ({ default: () => <div>champions-card</div> }));
vi.mock('../EventHeroCard', () => ({ default: () => <div>event-card</div> }));
vi.mock('../FlyerHeroCard', () => ({ default: () => <div>flyer-card</div> }));
vi.mock('../ParticipationHeroCard', () => ({ default: () => <div>participation-card</div> }));
vi.mock('../RequestHeroCard', () => ({ default: () => <div>request-card</div> }));
vi.mock('../StandardHeroCard', () => ({ default: () => <div>standard-card</div> }));

import HeroCard from '../HeroCard';

afterEach(() => vi.resetAllMocks());

describe('HeroCard', () => {
  it.each([
    ['champions', 'champions-card'],
    ['event', 'event-card'],
    ['announcement', 'announcement-card'],
    ['participation', 'participation-card'],
    ['request', 'request-card'],
    ['flyer', 'flyer-card'],
    ['standard', 'standard-card'],
    ['unknown', 'standard-card'],
  ])('routes %s to %s', (cardType, expected) => {
    render(<HeroCard card={{ card_type: cardType } as never} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
