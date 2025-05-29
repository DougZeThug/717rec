
import { useState, useCallback } from "react";

export const useTeamSelection = (initialSelected: string[] = []) => {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  const toggle = useCallback((id: string, maxTeams?: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (!maxTeams || next.size < maxTeams) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const setSelectedArray = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  return { 
    selected, 
    toggle, 
    setSelected: setSelectedArray,
    count: selected.size,
    selectedArray: Array.from(selected)
  };
};
