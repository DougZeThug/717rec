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
  const { user } = useAuth();
  const { activeMembership: membership } = useTeamMembership();

  const [nameDraft, setName] = useState<string | null>(null);
  const [teamDraft, setTeam] = useState<string | null>(null);
  const [contactDraft, setContact] = useState<string | null>(null);

  const verifiedName = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    return meta?.full_name || meta?.name || user?.email || '';
  }, [user]);
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
