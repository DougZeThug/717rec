/**
 * Remembers that the person asked to sign out, so the auth listener can tell it
 * from a session that ended on its own (an expired token, or a sign-out in
 * another tab).
 *
 * A module-level flag rather than state: it is set a moment before the sign-out
 * call and read by the listener when the SIGNED_OUT event arrives, which can be
 * from a different render.
 */
let userSignOutPending = false;

/** Call just before asking Supabase to sign out. */
export const markUserSignOut = (): void => {
  userSignOutPending = true;
};

/** Reads the flag and clears it. True when the sign-out was the person's own. */
export const consumeUserSignOut = (): boolean => {
  const wasUserInitiated = userSignOutPending;
  userSignOutPending = false;
  return wasUserInitiated;
};
