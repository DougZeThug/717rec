/**
 * Drag and Drop utilities for seed management
 */

import { ProcessedTeam } from '../types';

export interface DragDropResult {
  reorderedTeams: ProcessedTeam[];
  wasReordered: boolean;
}

/**
 * Reorder an array by moving an item from one position to another
 */
export const reorderArray = <T>(array: T[], fromIndex: number, toIndex: number): T[] => {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

/**
 * Calculate the drop position based on drag event
 */
export const getDropPosition = (
  dragEvent: DragEvent,
  containerElement: HTMLElement
): number => {
  const children = Array.from(containerElement.children);
  const dragOverElement = dragEvent.target as HTMLElement;
  
  // Find the closest draggable element
  let targetElement = dragOverElement;
  while (targetElement && !targetElement.draggable) {
    targetElement = targetElement.parentElement!;
  }
  
  if (!targetElement) return -1;
  
  return children.indexOf(targetElement);
};

/**
 * Assign sequential seeds based on team order
 */
export const assignSeedsByOrder = (teams: ProcessedTeam[]): ProcessedTeam[] => {
  return teams.map((team, index) => ({
    ...team,
    seed: index + 1
  }));
};

/**
 * Handle drag and drop reordering with automatic seed assignment
 */
export const handleDragDropReorder = (
  teams: ProcessedTeam[],
  fromIndex: number,
  toIndex: number
): DragDropResult => {
  if (fromIndex === toIndex) {
    return { reorderedTeams: teams, wasReordered: false };
  }
  
  const reorderedTeams = reorderArray(teams, fromIndex, toIndex);
  const teamsWithSeeds = assignSeedsByOrder(reorderedTeams);
  
  return { reorderedTeams: teamsWithSeeds, wasReordered: true };
};