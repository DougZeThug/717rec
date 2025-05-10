
import { useState, useEffect } from 'react';

export const usePreviousRankings = () => {
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedRankings = localStorage.getItem('previousRankings');
      const savedTimestamp = localStorage.getItem('rankingsLastUpdated');
      
      if (savedRankings) {
        try {
          const parsedRankings = JSON.parse(savedRankings);
          console.log("Loaded previous rankings from localStorage:", parsedRankings);
          setPreviousRankings(parsedRankings);
          
          if (savedTimestamp) {
            setLastUpdated(savedTimestamp);
            console.log("Rankings were last updated at:", savedTimestamp);
          }
        } catch (parseError) {
          console.error('Error parsing previous rankings:', parseError);
          // Clear invalid data
          localStorage.removeItem('previousRankings');
          setPreviousRankings({});
        }
      } else {
        console.log("No previous rankings found in localStorage");
      }
    } catch (error) {
      console.error('Error loading previous rankings:', error);
    }
  }, []);

  return { previousRankings, lastUpdated };
};
