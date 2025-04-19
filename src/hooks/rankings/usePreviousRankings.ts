
import { useState, useEffect } from 'react';

export const usePreviousRankings = () => {
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadPreviousRankings = () => {
      try {
        const storedRankings = localStorage.getItem('previousRankings');
        if (storedRankings) {
          setPreviousRankings(JSON.parse(storedRankings));
        }
      } catch (error) {
        console.error('Error loading previous rankings:', error);
        setPreviousRankings({});
      }
    };
    
    loadPreviousRankings();
  }, []);

  return previousRankings;
};
