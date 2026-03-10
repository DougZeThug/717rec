import { Keyboard } from 'lucide-react';
import React from 'react';

import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

export function AccessibilitySection() {
  return (
    <AccordionItem value="accessibility">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          <span>Accessibility & Keyboard Navigation</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        <p className="text-muted-foreground">
          717REC is designed to be accessible to all users, including those using screen readers or
          keyboard-only navigation.
        </p>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Keyboard Shortcuts</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Navigate between elements</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Tab</kbd>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Navigate backwards</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Shift + Tab</kbd>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Activate button or link</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Enter</kbd>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Toggle button (checkbox, etc.)</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Space</kbd>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Skip to main content</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Tab</kbd>
                  <span className="text-xs text-muted-foreground ml-2">(on page load)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Close dialog/menu</span>
                  <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Esc</kbd>
                </div>
              </div>
            </div>

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

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Need Help?</h4>
              <p className="text-sm text-muted-foreground">
                If you encounter any accessibility issues or have suggestions for improvement,
                please contact us through the{' '}
                <a href="/contact" className="text-primary hover:underline">
                  Contact page
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </AccordionContent>
    </AccordionItem>
  );
}
