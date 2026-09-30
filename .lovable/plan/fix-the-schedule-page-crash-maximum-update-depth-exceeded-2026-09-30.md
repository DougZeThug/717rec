# Fix the Schedule page crash ("Maximum update depth exceeded")

## What is wrong
- The Schedule page crashes when it opens, every time.
- The crash comes from the **row of dates at the top of the page** (the date strip).
- That row uses a ready-made scroll box. The scroll box then gets a second, sideways scroll bar.
- With the current React version, this scroll box with two scroll bars keeps updating itself without end. React stops it, and the page shows "Failed to load Schedule".
- Other pages that use the same scroll box with only one scroll bar work. I opened the Message Board to check, and it loads.

## The fix (one file)
- In the date strip, replace the ready-made scroll box with a normal box that scrolls sideways.
- The project rules already ask for this kind of normal sideways scrolling on phones.
- Nothing else changes: the dates, the dots on nights that have matches, tapping a date, and scrolling to the selected date all stay the same.
- The thin scroll bar under the dates will look like the browser's normal thin scroll bar. The default one does not show.

## How I will check it
- Open the Schedule page in the browser on a phone-size screen and on a computer-size screen. It must load, with no error.
- Tap a different date. The strip must scroll to that date.
- Confirm the page now has its main heading. This also finishes checking the SEO heading fix.
- Run the Schedule tests, the type check, and the style check.

## Technical details
- File: `src/components/schedule/DateStrip.tsx`.
- Replace `<ScrollArea>` + `<ScrollBar orientation="horizontal">` with `<div className="w-full overflow-x-auto whitespace-nowrap [scrollbar-width:thin]">`.
- Cause from the stack trace: `@radix-ui/react-compose-refs` `setRef` → `setState` loop inside `@radix-ui/react-scroll-area` 1.2.18 under React 19.3.0 (vertical + horizontal scrollbars mounted together).
- Keep `selectedRef` + `scrollIntoView({ inline: 'center' })`: it works on a native scroll box.
- `src/components/ui/scroll-area.tsx` is not changed. Its other users show only a vertical scroll bar.
