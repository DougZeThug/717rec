import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Trophy } from 'lucide-react';
import { useCareerRankings } from '@/hooks/useCareerRankings';
import CareerRankingsTable from './CareerRankingsTable';
import { cn } from '@/lib/utils';

const CareerRankingsSection: React.FC = () => {
  const { data: careerRankings, isLoading, error } = useCareerRankings();
  const [isOpen, setIsOpen] = React.useState(false);

  if (error) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Career Statistics
          </CardTitle>
          <CardDescription>
            Error loading career statistics: {error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-8">
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <div>
                  <CardTitle>Career Statistics</CardTitle>
                  <CardDescription>
                    Historical performance across all seasons and playoffs
                  </CardDescription>
                </div>
              </div>
              <ChevronDown 
                className={cn(
                  "h-5 w-5 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-2 sm:p-4 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800/90 dark:to-gray-900">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading career statistics...</span>
              </div>
            ) : careerRankings && careerRankings.length > 0 ? (
              <CareerRankingsTable rankings={careerRankings} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No career statistics available.
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default CareerRankingsSection;