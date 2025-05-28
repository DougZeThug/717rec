
// Temporary stub so legacy hooks compile until Challonge migration finishes
export const SimpleBracketCreationService = {
  createBracket: () => Promise.reject("Legacy service removed"),
};

export const updateMatchScore = (..._args: unknown[]): Promise<never> =>
  Promise.reject("Legacy service removed");
