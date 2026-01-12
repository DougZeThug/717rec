import { useEffect, useState } from 'react';

import { debugLog, errorLog } from '@/utils/logger';

// Define interface for the stored rankings data with timestamp
interface RankingsData {
  rankings: Record<string, number>;
  timestamp: string;
  version: number;
}

// Minimum time (in hours) before updating historical rankings
const HISTORY_UPDATE_THRESHOLD_HOURS = 12;

export const usePreviousRankings = (): {
  previousRankings: Record<string, number>;
  lastUpdated: string | null;
} => {
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const loadRankings = async () => {
      try {
        debugLog('Loading historical and current ranking data');

        // Try to load from database first
        const { loadRankingsFromDatabase } = await import('@/services/RankingSnapshotService');
        const dbRankings = await loadRankingsFromDatabase();

        if (Object.keys(dbRankings).length > 0) {
          debugLog('Loaded rankings from database');
          setPreviousRankings(dbRankings);
          setLastUpdated(new Date().toISOString());
          return;
        }

        // Fallback to localStorage if database is empty
        const savedHistoricalData = localStorage.getItem('previousRankings');
        const savedCurrentData = localStorage.getItem('currentRankings');

        if (savedHistoricalData) {
          try {
            const parsedHistoricalData: RankingsData = JSON.parse(savedHistoricalData);
            debugLog('Loaded historical rankings data from localStorage');

            setPreviousRankings(parsedHistoricalData.rankings);
            setLastUpdated(parsedHistoricalData.timestamp);

            // If there's current data available, check if we need to update historical data
            if (savedCurrentData) {
              try {
                const parsedCurrentData: RankingsData = JSON.parse(savedCurrentData);

                // Check if historical data should be updated based on timestamp
                if (shouldUpdateHistoricalData(parsedHistoricalData.timestamp)) {
                  debugLog('Historical data needs updating - threshold time has passed');

                  // Update historical data with the current data
                  localStorage.setItem('previousRankings', savedCurrentData);
                  setPreviousRankings(parsedCurrentData.rankings);
                  setLastUpdated(parsedCurrentData.timestamp);
                }
              } catch (parseError) {
                errorLog('Error parsing current rankings:', parseError);
              }
            }
          } catch (parseError) {
            errorLog('Error parsing historical rankings:', parseError);
            // Clear invalid data
            localStorage.removeItem('previousRankings');
            setPreviousRankings({});
          }
        } else {
          debugLog('No historical rankings found');

          // If no historical data but we have current data, use that as baseline
          if (savedCurrentData) {
            try {
              const parsedCurrentData: RankingsData = JSON.parse(savedCurrentData);
              localStorage.setItem('previousRankings', savedCurrentData);
              setPreviousRankings(parsedCurrentData.rankings);
              setLastUpdated(parsedCurrentData.timestamp);
              debugLog('Current rankings promoted to historical rankings (first run)');
            } catch (parseError) {
              errorLog('Error parsing current rankings during promotion:', parseError);
            }
          }
        }
      } catch (error) {
        errorLog('Error loading rankings data:', error);
      }
    };

    loadRankings();
  }, []);

  // Helper to determine if historical data should be updated based on timestamp
  const shouldUpdateHistoricalData = (timestamp: string): boolean => {
    if (!timestamp) return true;

    const lastUpdate = new Date(timestamp).getTime();
    const now = new Date().getTime();
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

    debugLog(`Hours since last historical update: ${hoursSinceUpdate.toFixed(2)}`);

    // Only update if sufficient time has passed
    return hoursSinceUpdate > HISTORY_UPDATE_THRESHOLD_HOURS;
  };

  return { previousRankings: previousRankings ?? {}, lastUpdated };
};
