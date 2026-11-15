// Types for the strict-mode copy next to this file. Same signature as @types/edmonds-blossom.
// An ambient declaration (no top-level import or export), like the files in src/types.
declare module '@/utils/autoSchedule/blossom/vendor/edmondsBlossomStrict' {
  export default function blossom(edges: number[][], maxCardinality?: boolean): number[];
}
