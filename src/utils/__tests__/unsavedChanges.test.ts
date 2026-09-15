import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearUnsavedWork,
  confirmDiscardUnsavedWork,
  confirmLeavingClick,
  findUnsavedWork,
  registerUnsavedWork,
} from '../unsavedChanges';

describe('unsaved work registry', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clearUnsavedWork();
    // jsdom has no window.confirm implementation of its own.
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    clearUnsavedWork();
    confirmSpy.mockRestore();
  });

  it('says it is safe to carry on when nothing is registered', () => {
    expect(confirmDiscardUnsavedWork()).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('says it is safe to carry on when nothing registered is dirty', () => {
    registerUnsavedWork({ isDirty: () => false, message: 'Scores' });

    expect(confirmDiscardUnsavedWork()).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('asks with the message of the work that is unsaved', () => {
    registerUnsavedWork({ isDirty: () => false, message: 'Clean' });
    registerUnsavedWork({ isDirty: () => true, message: 'Unsaved scores' });

    expect(confirmDiscardUnsavedWork()).toBe(true);
    expect(confirmSpy).toHaveBeenCalledWith('Unsaved scores');
  });

  it('reports the admin choosing to stay', () => {
    confirmSpy.mockReturnValue(false);
    registerUnsavedWork({ isDirty: () => true, message: 'Unsaved scores' });

    expect(confirmDiscardUnsavedWork()).toBe(false);
  });

  // The value is read at the moment of asking, so a section that saves its work
  // stops blocking without re-registering.
  it('reads dirtiness fresh each time', () => {
    let dirty = true;
    registerUnsavedWork({ isDirty: () => dirty, message: 'Scores' });

    expect(findUnsavedWork()).not.toBeNull();

    dirty = false;
    expect(findUnsavedWork()).toBeNull();
  });

  it('forgets a source once it unregisters', () => {
    const unregister = registerUnsavedWork({ isDirty: () => true, message: 'Scores' });

    expect(findUnsavedWork()).not.toBeNull();

    unregister();
    expect(findUnsavedWork()).toBeNull();
  });

  describe('confirmLeavingClick', () => {
    it('lets a click through when there is nothing to lose', () => {
      const event = { preventDefault: vi.fn() };

      expect(confirmLeavingClick(event)).toBe(true);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('lets a click through once the admin says to discard the work', () => {
      registerUnsavedWork({ isDirty: () => true, message: 'Unsaved scores' });
      const event = { preventDefault: vi.fn() };

      expect(confirmLeavingClick(event)).toBe(true);
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(confirmSpy).toHaveBeenCalledWith('Unsaved scores');
    });

    it('cancels the click when the admin chooses to stay', () => {
      confirmSpy.mockReturnValue(false);
      registerUnsavedWork({ isDirty: () => true, message: 'Unsaved scores' });
      const event = { preventDefault: vi.fn() };

      expect(confirmLeavingClick(event)).toBe(false);
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });
});
