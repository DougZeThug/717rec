import userEvent from '@testing-library/user-event';

/**
 * Opens a Radix overlay trigger (Select, DropdownMenu, Popover) with the
 * keyboard instead of a mouse click.
 *
 * Why: jsdom has no real PointerEvent, so after the first test in a file Radix
 * treats the opening pointerdown as a click outside the layer and closes the
 * overlay again in the same instant. The keyboard path is the same user action
 * (focus the trigger, press Enter) and is stable in every test.
 */
export const openRadixTrigger = async (trigger: HTMLElement): Promise<void> => {
  trigger.focus();
  await userEvent.keyboard('{Enter}');
};
