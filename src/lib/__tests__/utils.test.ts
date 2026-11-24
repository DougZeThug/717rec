import { describe, expect, it } from 'vitest';

import { cn } from '../utils';

// The project keeps v3's fixed line heights for text-* (src/index.css). A text
// size that comes after a leading-* class must drop it, as in tailwind-merge
// 3.7.0. Stock 3.7.1 keeps both, which would shrink every CardTitle and Label.
describe('cn keeps the v3 line-height rule', () => {
  it('drops an earlier leading-* when a text size follows', () => {
    expect(cn('leading-none text-lg')).toBe('text-lg');
    expect(cn('leading-relaxed', 'text-sm')).toBe('text-sm');
    expect(cn('leading-[22px] text-[15px]')).toBe('text-[15px]');
  });

  it('lets a caller text size replace a component default leading-*', () => {
    expect(cn('text-2xl font-semibold leading-none tracking-tight', 'text-lg')).toBe(
      'font-semibold tracking-tight text-lg'
    );
    expect(cn('text-sm font-medium leading-none', 'flex-1 text-sm')).toBe(
      'font-medium flex-1 text-sm'
    );
  });

  it('keeps a leading-* that comes after the text size', () => {
    expect(cn('text-lg leading-none')).toBe('text-lg leading-none');
    expect(cn('text-lg', 'leading-7')).toBe('text-lg leading-7');
  });

  it('keeps the leading-* when the text class is a colour or an alignment', () => {
    expect(cn('leading-none text-red-500')).toBe('leading-none text-red-500');
    expect(cn('leading-tight text-muted-foreground text-center')).toBe(
      'leading-tight text-muted-foreground text-center'
    );
  });

  it('keeps a size with its own line height shorthand', () => {
    expect(cn('leading-none text-base/6')).toBe('text-base/6');
  });

  it('treats a responsive size and a base leading-* as different', () => {
    expect(cn('leading-none md:text-lg')).toBe('leading-none md:text-lg');
    expect(cn('text-lg lg:leading-none')).toBe('text-lg lg:leading-none');
    expect(cn('md:leading-7 md:text-lg')).toBe('md:text-lg');
  });

  it('still merges ordinary conflicts and drops falsy values', () => {
    expect(cn('p-2', false, undefined, 'p-4')).toBe('p-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });
});
