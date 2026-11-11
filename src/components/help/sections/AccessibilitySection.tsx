import { Keyboard } from 'lucide-react';
import React from 'react';

import { HelpAccordionItem } from '../HelpAccordionItem';

function ShortcutRow({ label, keys, note }: { label: string; keys: string; note?: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-muted-foreground">{label}</span>
      <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{keys}</kbd>
      {note && <span className="text-xs text-muted-foreground ml-2">{note}</span>}
    </div>
  );
}

function KeyboardShortcuts() {
  return (
    <div>
      <h4 className="font-semibold mb-2">Keyboard Shortcuts</h4>
      <div className="space-y-2 text-sm">
        <ShortcutRow label="Navigate between elements" keys="Tab" />
        <ShortcutRow label="Navigate backwards" keys="Shift + Tab" />
        <ShortcutRow label="Activate button or link" keys="Enter" />
        <ShortcutRow label="Toggle button (checkbox, etc.)" keys="Space" />
        <ShortcutRow label="Skip to main content" keys="Tab" note="(on page load)" />
        <ShortcutRow label="Close dialog/menu" keys="Esc" />
      </div>
    </div>
  );
}

function ScreenReaderSupport() {
  return (
    <div className="border-t pt-4">
      <h4 className="font-semibold mb-2">Screen Reader Support</h4>
      <p className="text-sm text-muted-foreground">
        717REC works with popular screen readers including:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
        <li>JAWS (Windows)</li>
        <li>NVDA (Windows)</li>
        <li>VoiceOver (macOS, iOS)</li>
        <li>TalkBack (Android)</li>
      </ul>
    </div>
  );
}

function AccessibilityFeatures() {
  return (
    <div className="border-t pt-4">
      <h4 className="font-semibold mb-2">Accessibility Features</h4>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        <li>All interactive elements are keyboard accessible</li>
        <li>Clear focus indicators show where you are on the page</li>
        <li>Loading states and errors are announced to screen readers</li>
        <li>Skip navigation link to bypass repetitive content</li>
        <li>Proper heading structure for easy navigation</li>
        <li>High contrast text for readability</li>
        <li>Touch-friendly button sizes (44px minimum)</li>
        <li>ARIA labels on icon buttons for clarity</li>
      </ul>
    </div>
  );
}

function NeedHelp() {
  return (
    <div className="border-t pt-4">
      <h4 className="font-semibold mb-2">Need Help?</h4>
      <p className="text-sm text-muted-foreground">
        If you encounter any accessibility issues or have suggestions for improvement, please
        contact us through the{' '}
        {/* Underlined, and the text shade of primary: axe flagged a link told apart by colour
            alone, and text-primary was 3.8:1 in dark. */}
        <a href="/contact" className="text-primary-text underline underline-offset-4">
          Contact page
        </a>
        .
      </p>
    </div>
  );
}

// The same bordered box and icon chip as the other Help sections (it was a bare row with a card
// inside it). HelpAccordionItem makes the content text-sm, so the intro matches the rest.
export function AccessibilitySection() {
  return (
    <HelpAccordionItem
      value="accessibility"
      icon={Keyboard}
      title="Accessibility & Keyboard Navigation"
    >
      <p className="text-muted-foreground">
        717REC is designed to be accessible to all users, including those using screen readers or
        keyboard-only navigation.
      </p>
      <KeyboardShortcuts />
      <ScreenReaderSupport />
      <AccessibilityFeatures />
      <NeedHelp />
    </HelpAccordionItem>
  );
}
