
import React, { useState } from 'react';
import BracketViewer from './BracketViewer';
import { BracketData } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Sample data for testing the bracket viewer
 */
const sampleBracketData: BracketData = {
  participants: [
    { id: 1, name: 'Team Alpha', seed: 1 },
    { id: 2, name: 'Team Beta', seed: 2 },
    { id: 3, name: 'Team Gamma', seed: 3 },
    { id: 4, name: 'Team Delta', seed: 4 },
    { id: 5, name: 'Team Echo', seed: 5 },
    { id: 6, name: 'Team Foxtrot', seed: 6 },
    { id: 7, name: 'Team Golf', seed: 7 },
    { id: 8, name: 'Team Hotel', seed: 8 }
  ],
  matches: [
    // Quarterfinals (Round 1)
    { id: 1, round: 1, position: 1, participant1_id: 1, participant2_id: 8, winner_id: 1 },
    { id: 2, round: 1, position: 2, participant1_id: 4, participant2_id: 5, winner_id: 4 },
    { id: 3, round: 1, position: 3, participant1_id: 2, participant2_id: 7, winner_id: 2 },
    { id: 4, round: 1, position: 4, participant1_id: 3, participant2_id: 6, winner_id: 3 },
    
    // Semifinals (Round 2)
    { id: 5, round: 2, position: 1, participant1_id: 1, participant2_id: 4, winner_id: 1 },
    { id: 6, round: 2, position: 2, participant1_id: 2, participant2_id: 3, winner_id: 2 },
    
    // Finals (Round 3)
    { id: 7, round: 3, position: 1, participant1_id: 1, participant2_id: 2, winner_id: 1 }
  ]
};

/**
 * Sample component for testing BracketViewer integration
 */
const SampleBracketViewer: React.FC = () => {
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  
  const handleMatchClick = (matchId: string) => {
    console.log('Match clicked:', matchId);
    setSelectedMatch(matchId);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bracket Viewer Test</CardTitle>
          <Badge variant="secondary">Phase 1: Basic Integration</Badge>
        </div>
        <p className="text-sm text-gray-600">
          Testing brackets-viewer.js integration with sample tournament data
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        {selectedMatch && (
          <div className="p-4 bg-muted border-b">
            <div className="flex items-center justify-between">
              <p className="font-medium">Selected Match ID: {selectedMatch}</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedMatch(null)}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
        
        <div className="h-[500px] relative">
          <BracketViewer
            bracketData={sampleBracketData}
            onMatchClick={handleMatchClick}
            className="w-full h-full"
          />
        </div>
        
        <div className="p-4 bg-gray-50 border-t">
          <div className="text-xs text-gray-500 space-y-1">
            <p>• {sampleBracketData.participants.length} teams in tournament</p>
            <p>• {sampleBracketData.matches.length} matches total</p>
            <p>• Click on any match to test interaction</p>
            <p>• If brackets-viewer fails to load, fallback message will display</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SampleBracketViewer;
