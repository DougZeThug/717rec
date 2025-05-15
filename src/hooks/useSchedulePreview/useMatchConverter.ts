
import { useCallback } from 'react';
import { TeamPairingMap } from '@/types/autoSchedule';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';
import { PreviewMatch } from './types';
import { useToast } from '@/hooks/use-toast';

export const useMatchConverter = () => {
  const { toast } = useToast();

  // Convert team pairings to match objects for form
  const convertPairingsToMatches = useCallback((
    pairings: TeamPairingMap,
    date: Date
  ): PreviewMatch[] => {
    if (!pairings || !date) {
      return [];
    }
    
    try {
      const matches: PreviewMatch[] = [];
      
      Object.entries(pairings).forEach(([block, blockPairings]) => {
        // Ensure we can access the TIME_BLOCKS for this block
        if (!TIME_BLOCKS[block]) {
          console.error(`Missing time block data for ${block}`);
          return;
        }
        
        blockPairings.forEach((pairing, index) => {
          // Alternate between main and secondary timeslots
          const timeslot = index % 2 === 0 
            ? TIME_BLOCKS[block].main 
            : TIME_BLOCKS[block].secondary;
          
          matches.push({
            id: Date.now().toString() + '-' + block + '-' + index,
            team1Id: pairing.team1.id,
            team2Id: pairing.team2.id,
            timeslot,
          });
        });
      });
      
      return matches;
    } catch (error) {
      console.error('Error converting pairings to matches:', error);
      toast({
        title: "Error",
        description: "Failed to convert pairings to matches",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  return {
    convertPairingsToMatches
  };
};
