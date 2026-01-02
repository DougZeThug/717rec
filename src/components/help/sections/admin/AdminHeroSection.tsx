import React from "react";
import { LayoutGrid } from "lucide-react";
import { HelpAccordionItem } from "../../HelpAccordionItem";

export const AdminHeroSection: React.FC = () => {
  return (
    <HelpAccordionItem value="admin-hero" icon={LayoutGrid} title="Hero Cards">
      <p>
        Hero cards appear on the homepage to highlight important
        announcements, upcoming events, or featured content.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Create cards with custom titles, images, and links</li>
        <li>Set visibility and ordering</li>
        <li>Use different card types for various content</li>
      </ul>
    </HelpAccordionItem>
  );
};
