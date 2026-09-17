import { useMemo, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useTeamMembership } from '@/hooks/useTeamMembership';

interface VerifiedIdentityOptions {
  /**
   * True when the topic is about registering a *new* team, in which case the
   * member's current team must not be locked over their proposal.
   */
  allowNewTeamName: boolean;
}

interface VerifiedIdentity {
  isSignedIn: boolean;
  name: string;
  team: string;
  contact: string;
  setName: (value: string) => void;
  setTeam: (value: string) => void;
  setContact: (value: string) => void;
  /** Read-only, with a "Verified" badge, because it came from the profile. */
  nameLocked: boolean;
  teamLocked: boolean;
}

/**
 * Who the league thinks is writing, and what they are allowed to change.
 *
 * A signed-in member's name, team and email fill the form in and lock, so the
 * league can tell a verified message from an anonymous one.
 *
 * The values are **derived during render** from whatever the auth and
 * membership hooks currently hold, never copied into state by an effect. That
 * is the whole point: those hooks resolve after the first paint, and copying
 * would overwrite a name the visitor had already started typing. A typed value
 * wins, and once it differs from the verified one the field unlocks and the
 * badge goes.
 */
export const useVerifiedIdentity = ({
  allowNewTeamName,
}: VerifiedIdentityOptions): VerifiedIdentity => {
  const { user, profile } = useAuth();
  const { activeMembership: membership } = useTeamMembership();

  const [nameDraft, setName] = useState<string | null>(null);
  const [teamDraft, setTeam] = useState<string | null>(null);
  const [contactDraft, setContact] = useState<string | null>(null);

  // Leaving "Join the league" throws the proposed name away. It only ever
  // answered that one question, and keeping it would sit in the Team box on
  // every topic after it -- editable, unbadged -- in place of the member's real
  // team, and would make the box appear on a support topic for a member who has
  // no team at all. Adjusting state during render is React's own pattern for
  // reacting to a changed prop; an effect would paint the stale value first.
  const [wasNewTeamAllowed, setWasNewTeamAllowed] = useState(allowNewTeamName);
  if (wasNewTeamAllowed !== allowNewTeamName) {
    setWasNewTeamAllowed(allowNewTeamName);
    if (!allowNewTeamName) setTeam(null);
  }

  // The name comes from the profiles row, which every member has, whichever
  // way they signed up. `user_metadata` is only filled in by Google sign-in,
  // so reading it put an email-and-password member's address in the Name box —
  // locked, and badged as verified. There is no fallback to the email: an
  // address is not a name, and a member with neither name on file is better
  // served by an open field than by a locked wrong one.
  //
  // This is the same rule the server applies in submit-contact-request, which
  // overrides the submitted name with profiles.full_name || profiles.username.
  const verifiedName = useMemo(() => profile?.full_name || profile?.username || '', [profile]);
  const verifiedTeam = membership?.team?.name ?? '';

  const isSignedIn = Boolean(user);
  const name = nameDraft ?? (user ? verifiedName : '');
  const team = teamDraft ?? (user ? verifiedTeam : '');
  const contact = contactDraft ?? user?.email ?? '';

  return {
    isSignedIn,
    name,
    team,
    contact,
    setName,
    setTeam,
    setContact,
    nameLocked: isSignedIn && Boolean(verifiedName) && name === verifiedName,
    teamLocked: isSignedIn && Boolean(verifiedTeam) && team === verifiedTeam && !allowNewTeamName,
  };
};
