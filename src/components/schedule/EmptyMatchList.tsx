import React from "react";
import { CalendarX, Calendar, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from "react-router";

interface EmptyMatchListProps {
  searchTerm: string;
  isCompleted: boolean;
}

const EmptyMatchList: React.FC<EmptyMatchListProps> = ({ searchTerm, isCompleted }) => {
  const navigate = useNavigate();

  const getEmptyStateContent = () => {
    if (searchTerm) {
      return {
        icon: Search,
        title: "No Matches Found",
        description: `No matches found for "${searchTerm}". Try a different search term.`,
        actions: [],
      };
    }

    if (isCompleted) {
      return {
        icon: CalendarX,
        title: "No Completed Matches",
        description: "Once matches are played and scores are recorded, they'll appear here.",
        actions: [],
      };
    }

    return {
      icon: Calendar,
      title: "No Upcoming Matches",
      description: "There are no scheduled matches yet. Check back later for updates.",
      actions: [
        {
          label: "View Teams",
          onClick: () => navigate("/teams"),
          variant: "outline" as const,
        },
      ],
    };
  };

  const { icon, title, description, actions } = getEmptyStateContent();

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      actions={actions}
    />
  );
};

export default EmptyMatchList;
