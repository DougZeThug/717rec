
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertTriangle, Info, Clock, Zap, Target } from 'lucide-react';
import { MatchQualityMetrics } from '@/types/autoSchedule';

interface QualityMetricsDisplayProps {
  metrics: MatchQualityMetrics;
  compact?: boolean;
}

export const QualityMetricsDisplay: React.FC<QualityMetricsDisplayProps> = ({ 
  metrics, 
  compact = false 
}) => {
  const getQualityIcon = (rating: string) => {
    switch (rating) {
      case 'Excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'Fair': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'Poor': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getQualityColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'bg-green-500';
      case 'Good': return 'bg-blue-500';
      case 'Fair': return 'bg-yellow-500';
      case 'Poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {getQualityIcon(metrics.qualityRating)}
        <span className="font-medium">{metrics.qualityRating}</span>
        <Badge variant="outline" className="text-xs">
          {metrics.averageCompatibilityScore.toFixed(1)}/10
        </Badge>
        <span className="text-muted-foreground">
          {metrics.totalMatches} matches
        </span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5" />
          Schedule Quality Analysis
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Quality */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getQualityIcon(metrics.qualityRating)}
            <span className="font-medium">Overall Quality</span>
          </div>
          <Badge className={getQualityColor(metrics.qualityRating)}>
            {metrics.qualityRating}
          </Badge>
        </div>
        
        {/* Compatibility Score */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Match Compatibility</span>
            <span className="font-medium">{metrics.averageCompatibilityScore.toFixed(1)}/10</span>
          </div>
          <Progress 
            value={metrics.averageCompatibilityScore * 10} 
            className="h-2"
          />
        </div>
        
        {/* Opponent Diversity */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Opponent Diversity</span>
            <span className="font-medium">{metrics.opponentDiversity.diversityScore}%</span>
          </div>
          <Progress 
            value={metrics.opponentDiversity.diversityScore} 
            className="h-2"
          />
        </div>
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                  <div className="text-lg font-semibold">{metrics.totalMatches}</div>
                  <div className="text-xs text-muted-foreground">Total Matches</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total number of matches generated</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                  <div className="text-lg font-semibold text-red-600">{metrics.rematchCount}</div>
                  <div className="text-xs text-muted-foreground">Rematches</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Matches between teams that have played before</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                  <div className="text-lg font-semibold text-green-600">
                    {metrics.powerScoreAnalysis.balancedMatches}
                  </div>
                  <div className="text-xs text-muted-foreground">Balanced</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Matches with similar team strength levels</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="text-sm font-semibold">
                      {metrics.performanceMetrics.generationTimeMs}ms
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Generation Time</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Time taken to generate the schedule</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Block Analysis (if dual-block) */}
        {metrics.blockAnalysis && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">Block Analysis</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Primary Block Quality</span>
                <span className="font-medium">{metrics.blockAnalysis.primaryBlockQuality.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between">
                <span>Secondary Block Quality</span>
                <span className="font-medium">{metrics.blockAnalysis.secondaryBlockQuality.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between">
                <span>Cross-Block Diversity</span>
                <span className="font-medium">{metrics.blockAnalysis.crossBlockDiversity}%</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Feedback Section */}
        {(metrics.feedback.strengths.length > 0 || 
          metrics.feedback.improvements.length > 0 || 
          metrics.feedback.recommendations.length > 0) && (
          <div className="border-t pt-3 space-y-2">
            {metrics.feedback.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-600 mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Strengths
                </h4>
                <ul className="text-xs space-y-1">
                  {metrics.feedback.strengths.map((strength, index) => (
                    <li key={index} className="text-green-700 dark:text-green-300">
                      • {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {metrics.feedback.improvements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-yellow-600 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Areas for Improvement
                </h4>
                <ul className="text-xs space-y-1">
                  {metrics.feedback.improvements.map((improvement, index) => (
                    <li key={index} className="text-yellow-700 dark:text-yellow-300">
                      • {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {metrics.feedback.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-600 mb-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Recommendations
                </h4>
                <ul className="text-xs space-y-1">
                  {metrics.feedback.recommendations.map((recommendation, index) => (
                    <li key={index} className="text-blue-700 dark:text-blue-300">
                      • {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QualityMetricsDisplay;
