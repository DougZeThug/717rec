export const matchInteractionKeys = {
  comments: (matchId: string) => ['match-comments', matchId] as const,
  reactions: (matchId: string) => ['match-reactions', matchId] as const,
};
