
import { useEffect } from 'react';

interface UseMatchEventListenersProps {
  updateFiltersForMatchDate: (date: Date) => void;
}

export const useMatchEventListeners = ({ 
  updateFiltersForMatchDate 
}: UseMatchEventListenersProps) => {
  useEffect(() => {
    // Listen for custom events when matches are created
    const handleMatchesCreated = (event: Event) => {
      const customEvent = event as CustomEvent<{date: Date}>;
      if (customEvent.detail && customEvent.detail.date) {
        console.log('Match creation event detected, updating filters to:', customEvent.detail.date);
        updateFiltersForMatchDate(customEvent.detail.date);
      }
    };

    window.addEventListener('matchesCreated', handleMatchesCreated);

    return () => {
      window.removeEventListener('matchesCreated', handleMatchesCreated);
    };
  }, [updateFiltersForMatchDate]);
};
