// Deep imports (not the barrel): the renderer hook's test suite mocks
// '@/services/brackets/viewer', and these decorations must stay real there.
import { buildSlotHints } from '@/services/brackets/viewer/MatchLabelCalculator';
import type {
  BracketGroupRow,
  BracketRoundRow,
  ViewerMatch,
  ViewerParticipant,
} from '@/services/brackets/viewer/types';

export const SEED_BADGE_CLASS = 'seed-badge';

export interface BracketDecorationData {
  matches: ViewerMatch[];
  groups?: BracketGroupRow[];
  rounds?: BracketRoundRow[];
  participants: ViewerParticipant[];
  stageType?: string;
}

/** Map participant id -> stored seed. Legacy bracket paths carry no
 * positions, which yields an empty map and turns badge injection into a no-op. */
export function buildParticipantSeedMap(
  participants: ViewerParticipant[] | undefined
): Map<number, number> {
  const seeds = new Map<number, number>();
  for (const participant of participants ?? []) {
    if (participant.position != null) seeds.set(participant.id, participant.position);
  }
  return seeds;
}

/**
 * Decorate an already-rendered bracket with flow hints ("Winner of WB 1.1")
 * on TBD slots and persistent "#N" seed badges on filled slots.
 *
 * Purely additive DOM work on top of brackets-viewer's output — the library
 * itself receives unmodified data. Idempotent (safe to run repeatedly on the
 * same DOM) and a graceful no-op when the dataset lacks groups/rounds.
 */
export function decorateBracketDom(container: HTMLElement, data: BracketDecorationData): void {
  const { matches, groups, rounds, participants, stageType } = data;
  if (!matches?.length || !groups?.length || !rounds?.length) return;

  const slotHints = buildSlotHints(matches, groups, rounds, stageType);
  const seedMap = buildParticipantSeedMap(participants);
  const matchesById = new Map(matches.map((m) => [String(m.id), m]));

  container.querySelectorAll<HTMLElement>('.match[data-match-id]').forEach((matchEl) => {
    const matchId = matchEl.getAttribute('data-match-id');
    const match = matchId ? matchesById.get(matchId) : undefined;
    if (!match || !matchId) return;

    // brackets-viewer renders slots in [opponent1, opponent2] document order.
    matchEl.querySelectorAll<HTMLElement>('.participant').forEach((slotEl, index) => {
      if (index > 1) return;
      const side = index === 0 ? ('opponent1' as const) : ('opponent2' as const);
      const nameEl = slotEl.querySelector<HTMLElement>('.name');
      if (!nameEl) return;

      if (slotEl.hasAttribute('data-participant-id')) {
        applySeedBadge(nameEl, slotEl, match[side], seedMap);
      } else {
        applyFlowHint(nameEl, slotEl, slotHints.get(matchId)?.[side]);
      }
    });
  });
}

function applySeedBadge(
  nameEl: HTMLElement,
  slotEl: HTMLElement,
  opponent: ViewerMatch['opponent1'],
  seedMap: Map<number, number>
): void {
  // Slots whose data carries a position (Winners R1) already received the
  // library's native "#N " span — adding ours would double-badge them.
  if (opponent?.position !== undefined) return;
  if (nameEl.querySelector(`.${SEED_BADGE_CLASS}`)) return;

  const seed = seedMap.get(Number(slotEl.getAttribute('data-participant-id')));
  if (seed === undefined) return;

  const badge = document.createElement('span');
  badge.className = SEED_BADGE_CLASS;
  badge.textContent = `#${seed} `;
  nameEl.prepend(badge);
}

function applyFlowHint(nameEl: HTMLElement, slotEl: HTMLElement, hint: string | undefined): void {
  if (!hint) return;
  if (slotEl.classList.contains('bye') || nameEl.classList.contains('bye')) return;
  if (nameEl.classList.contains('hint')) return;
  if (nameEl.textContent?.trim()) return;

  // The library's own hint class, so existing --hint-color theming applies.
  nameEl.classList.add('hint');
  nameEl.title = hint;
  nameEl.textContent = hint;
}
