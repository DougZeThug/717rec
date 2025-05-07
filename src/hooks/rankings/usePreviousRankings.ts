
import { useState, useEffect } from 'react';

export const usePreviousRankings = () => {
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const savedRankings = localStorage.getItem('previousRankings');
      if (savedRankings) {
        const parsedRankings = JSON.parse(savedRankings);
        console.log("Loaded previous rankings from localStorage:", parsedRankings);
        setPreviousRankings(parsedRankings);
      } else {
        console.log("No previous rankings found in localStorage");
      }
    } catch (error) {
      console.error('Error loading previous rankings:', error);
    }
  }, []);

  return previousRankings;
};
