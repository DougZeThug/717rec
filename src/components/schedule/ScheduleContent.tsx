
import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle } from "lucide-react";
import { Match, Team } from "@/types";
import DateMatchGroup from "./DateMatchGroup";
import { format, isToday, parseISO, isSameDay } from "date-fns";

interface ScheduleContentProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  filteredMatches: Match[];
  teams: Team[];
  selectedDate: Date;
  onEditMatch?: (match: Match) => void;
  onDeleteMatch?: (matchId: string) => void;
}

const ScheduleContent: React.FC<ScheduleContentProps> = ({
  activeTab,
  setActiveTab,
  filteredMatches,
  teams,
  selectedDate,
  onEditMatch,
  onDeleteMatch
}) => {
  // Group matches by date
  const groupedMatches = useMemo(() => {
    const isCompletedTab = activeTab === "completed";
    
    // Filter matches by completion status
    const matchesForTab = filteredMatches.filter(match => 
      match.iscompleted === isCompletedTab
    );
    
    // Group by date
    const groups = matchesForTab.reduce((acc, match) => {
      if (!match.date) return acc;
      
      const matchDate = parseISO(match.date);
      const dateStr = format(matchDate, "yyyy-MM-dd");
      
      if (!acc[dateStr]) {
        acc[dateStr] = {
          date: matchDate,
          matches: []
        };
      }
      
      acc[dateStr].matches.push(match);
      return acc;
    }, {} as Record<string, { date: Date; matches: Match[] }>);
    
    // Sort dates (ascending for upcoming, descending for completed)
    return Object.values(groups).sort((a, b) => {
      if (isCompletedTab) {
        return b.date.getTime() - a.date.getTime(); // Newest first for completed
      }
      return a.date.getTime() - b.date.getTime(); // Oldest first for upcoming
    });
  }, [filteredMatches, activeTab]);
  
  // For empty state
  const isEmptyState = groupedMatches.length === 0;
  const emptyStateMessage = activeTab === "upcoming" 
    ? "No upcoming matches scheduled." 
    : "No completed matches found.";
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
      <TabsList className="w-full md:w-auto font-inter bg-gray-200 dark:bg-gray-700">
        <TabsTrigger value="upcoming" className="flex-1 md:flex-grow-0 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
          <Calendar className="h-4 w-4 mr-2" />
          Upcoming Matches
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex-1 md:flex-grow-0 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">
          <CheckCircle className="h-4 w-4 mr-2" />
          Completed Matches
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="upcoming" className="mt-6 dark:bg-gray-900">
        {isEmptyState ? (
          <div className="text-center py-12 font-inter dark:text-gray-300">
            <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400">
              {emptyStateMessage}
            </h3>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMatches.map(group => (
              <DateMatchGroup
                key={format(group.date, "yyyy-MM-dd")}
                date={group.date}
                matches={group.matches}
                isCurrentDay={isToday(group.date) || isSameDay(group.date, selectedDate)}
                onEditMatch={onEditMatch}
                onDeleteMatch={onDeleteMatch}
              />
            ))}
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="completed" className="mt-6 dark:bg-gray-900">
        {isEmptyState ? (
          <div className="text-center py-12 font-inter dark:text-gray-300">
            <h3 className="text-xl font-medium text-gray-500 dark:text-gray-400">
              {emptyStateMessage}
            </h3>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMatches.map(group => (
              <DateMatchGroup
                key={format(group.date, "yyyy-MM-dd")}
                date={group.date}
                matches={group.matches}
                isCurrentDay={isToday(group.date) || isSameDay(group.date, selectedDate)}
                // No edit/delete functionality for completed matches
              />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default ScheduleContent;
