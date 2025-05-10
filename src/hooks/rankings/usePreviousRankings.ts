
import { useState, useEffect } from 'react';

// Define interface for the stored rankings data with timestamp
interface RankingsData {
  rankings: Record<string, number>;
  timestamp: string;
  version: number;
}

// Minimum time (in hours) before updating historical rankings
const HISTORY_UPDATE_THRESHOLD_HOURS = 12;

export const usePreviousRankings = () => {
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Load historical rankings (used for trend comparison)
      const savedHistoricalData = localStorage.getItem('previousRankings');
      // Load current rankings (latest calculated values)
      const savedCurrentData = localStorage.getItem('currentRankings');
      
      console.log("Loading historical and current ranking data");
      
      if (savedHistoricalData) {
        try {
          const parsedHistoricalData: RankingsData = JSON.parse(savedHistoricalData);
          console.log("Loaded HISTORICAL rankings data:", parsedHistoricalData);
          
          setPreviousRankings(parsedHistoricalData.rankings);
          setLastUpdated(parsedHistoricalData.timestamp);
          
          // If there's current data available, check if we need to update historical data
          if (savedCurrentData) {
            try {
              const parsedCurrentData: RankingsData = JSON.parse(savedCurrentData);
              console.log("Loaded CURRENT rankings data:", parsedCurrentData);
              
              // Check if historical data should be updated based on timestamp
              if (shouldUpdateHistoricalData(parsedHistoricalData.timestamp)) {
                console.log("Historical data needs updating - threshold time has passed");
                
                // Update historical data with the current data
                localStorage.setItem('previousRankings', savedCurrentData);
                setPreviousRankings(parsedCurrentData.rankings);
                setLastUpdated(parsedCurrentData.timestamp);
                
                console.log("Historical rankings have been updated with current data");
              } else {
                console.log("Historical data is recent enough, keeping for trend comparison");
              }
            } catch (parseError) {
              console.error('Error parsing current rankings:', parseError);
            }
          }
        } catch (parseError) {
          console.error('Error parsing historical rankings:', parseError);
          // Clear invalid data
          localStorage.removeItem('previousRankings');
          setPreviousRankings({});
        }
      } else {
        console.log("No historical rankings found. If current rankings exist, they will be used for history");
        
        // If no historical data but we have current data, use that as baseline
        if (savedCurrentData) {
          try {
            const parsedCurrentData: RankingsData = JSON.parse(savedCurrentData);
            localStorage.setItem('previousRankings', savedCurrentData);
            setPreviousRankings(parsedCurrentData.rankings);
            setLastUpdated(parsedCurrentData.timestamp);
            console.log("Current rankings promoted to historical rankings (first run)");
          } catch (parseError) {
            console.error('Error parsing current rankings during promotion:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error loading rankings data:', error);
    }
  }, []);

  // Helper to determine if historical data should be updated based on timestamp
  const shouldUpdateHistoricalData = (timestamp: string): boolean => {
    if (!timestamp) return true;
    
    const lastUpdate = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
    
    console.log(`Hours since last historical update: ${hoursSinceUpdate.toFixed(2)}`);
    
    // Only update if sufficient time has passed
    return hoursSinceUpdate > HISTORY_UPDATE_THRESHOLD_HOURS;
  };

  return { previousRankings, lastUpdated };
};
