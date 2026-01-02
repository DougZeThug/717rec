import React from "react";
import { MessageSquare } from "lucide-react";
import { HelpAccordionItem } from "../HelpAccordionItem";

export const MessageBoardSection: React.FC = () => {
  return (
    <HelpAccordionItem value="messages" icon={MessageSquare} title="Message Board">
      <p>
        The message board is where league members can communicate,
        post updates, and engage with the community.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Post announcements and updates</li>
        <li>React to messages with emojis</li>
        <li>Filter by category or team</li>
        <li>Search for specific topics</li>
      </ul>
    </HelpAccordionItem>
  );
};
