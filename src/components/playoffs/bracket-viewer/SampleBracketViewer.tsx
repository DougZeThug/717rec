
import React, { useState } from 'react';
import BracketViewer from './BracketViewer';
import { BracketData } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Sample data for testing the bracket viewer
 */
const sampleBracketData: BracketData = {
  participants: [
    { id: 1, name: 'Team A', seed: 1 },
    { id: 2, name: 'Team B', seed: 2 },
    { id: 3, name: 'Team C', seed: 3 },
    { id: 4, name: 'Team D', seed: 4 },
    { id: 5, name: 'Team E', seed: 5 },
    { id: 6, name: 'Team F', seed: 6 },
    { id: 7, name: 'Team G', seed: 7 },
    { id: 8, name: 'Team H', seed: 8 }
  ],
  matches: [
    // First round (Round 1)
    { id: 1, round: 1, position: 1, participant1_id: 1, participant2_id: 8, winner_id: 1 },
    { id: 2, round: 1, position: 2, participant1_id: 4, participant2_id: 5, winner_id: 4 },
    { id: 3, round: 1, position: 3, participant1_id: 2, participant2_id: 7, winner_id: 2 },
    { id: 4, round: 1, position: 4, participant1_id: 3, participant2_id: 6, winner_id: 3 },
    
    // Second round (Round 2)
    { id: 5, round: 2, position: 1, participant1_id: 1, participant2_id: 4, winner_id: 1 },
    { id: 6, round: 2, position: 2, participant1_id: 2, participant2_id: 3, winner_id: 2 },
    
    // Final round (Round 3)
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
        <CardTitle>Bracket Viewer Test</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden">
        {selectedMatch && (
          <div className="p-4 bg-muted">
            <p>Selected Match ID: {selectedMatch}</p>
            <Button 
              variant="outline" 
              onClick={() => setSelectedMatch(null)}
              className="mt-2"
            >
              Clear Selection
            </Button>
          </div>
        )}
        
        <div className="h-[500px]">
          <BracketViewer
            bracketData={sampleBracketData}
            onMatchClick={handleMatchClick}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default SampleBracketViewer;
