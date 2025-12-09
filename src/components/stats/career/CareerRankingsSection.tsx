import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Trophy, EyeOff, Eye } from 'lucide-react';
import { useCareerRankingsWithHidden } from '@/hooks/useCareerRankingsWithHidden';
import CareerRankingsTable from './CareerRankingsTable';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const CareerRankingsSection: React.FC = () => {
  const isMobile = useIsMobile();
  const { 
    data: careerRankings, 
    isLoading, 
    error, 
    showHidden, 
    toggleShowHidden, 
    hiddenTeamCount 
  } = useCareerRankingsWithHidden();
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
          <CardHeader className={cn("cursor-pointer hover:bg-muted/50 transition-colors", isMobile ? "py-2.5 px-3" : "py-4")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className={cn("text-amber-500", isMobile ? "h-4 w-4" : "h-5 w-5")} />
                <div>
                  <CardTitle 
                    className={cn(
                      "font-bebas uppercase tracking-wide bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400",
                      isMobile ? "text-lg" : "text-xl sm:text-2xl"
                    )}
                    style={{ letterSpacing: "0.5px" }}
                  >
                    Career Statistics
                  </CardTitle>
                  {!isMobile && (
                    <CardDescription>
                      Historical performance across all seasons and playoffs
                      {showHidden && hiddenTeamCount > 0 && (
                        <span className="ml-2 text-xs bg-muted px-2 py-1 rounded">
                          +{hiddenTeamCount} hidden
                        </span>
                      )}
                    </CardDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {hiddenTeamCount > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <label htmlFor="show-hidden-toggle" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                            {showHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            <span className="hidden sm:inline">Hidden</span>
                          </label>
                          <Switch
                            id="show-hidden-toggle"
                            checked={showHidden}
                            onCheckedChange={toggleShowHidden}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{showHidden ? 'Hide' : 'Show'} teams from the hidden division</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <ChevronDown 
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
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
              <CareerRankingsTable rankings={careerRankings} showHidden={showHidden} />
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