# Accounts and roles

## Summary

717rec has three roles: **visitor**, **player**, and **admin**. Almost everything
in the app is readable by all three. What separates them is what they can write.

This document owns the role model, what a profile is, how a membership works, and
how the app gates pages. Every other document's "Permissions and roles" paragraph
links here rather than restating it.
[`cross-cutting/permissions.md`](../cross-cutting/permissions.md) is the
companion: this document says what the roles *are*, that one says what each can
*do* feature by feature.

## The simple case

A visitor opens the app and can read nearly all of it: teams, the schedule,
standings, playoffs, history, the message board, and even a match being scored
live. They can send one thing — a contact request.

They sign in with an email address and password, or with Google. If their profile
has no username yet, the app takes them straight to profile setup and they finish
there. They are now a player.

Being a player on its own changes little. What matters is having an **approved
membership** of a team: that is what lets them score their team's matches. A
player asks to join a team, an admin approves it, and only then does anything
change.

An admin is a player with one flag set. There are no partial admin roles.

## The three roles

### Visitor

Not signed in. Can read: home, teams, team details, schedule, standings, stats,
insights, compare, playoffs, history, the message board, help, and a live match
in progress. Can write: a contact request, and nothing else.

A visitor is never told they are missing anything on a read-only page. Controls
they cannot use are generally absent rather than disabled.

### Player

A signed-in account with a profile. On its own, a player can do very little more
than a visitor. The abilities that matter are attached to their **membership**,
not to being signed in.

### Admin

A signed-in account whose profile has the admin flag set. Admin is a **single
boolean on the profile**. There is no role table, no permission list, and no way
to grant part of it.

> **Technical note:** the app decides whether someone is an admin by reading the
> already-loaded profile, not by making a separate permissions call. That makes
> it instant and race-free, but it also means the browser's idea of "admin" and
> the database's idea are two independent mechanisms. They can disagree. Hiding a
> button and refusing the write are different things, and a document that says
> "an admin can do X" is describing the button, not the rule.

## Profile

The record attached to a signed-in account: a display name, a username, an avatar,
and the admin flag.

**A profile without a username is treated as incomplete.** When the app loads a
profile and finds no username, it sends the user to `/setup-profile`
automatically. This happens on sign-in and on page load, so a user without a
username cannot get far into the app without finishing it. See
[`getting-started/set-up-your-profile.md`](../getting-started/set-up-your-profile.md).

A profile is not a player. See [`league-objects.md`](league-objects.md): a player
is a roster entry and may have no account at all.

## Membership

The link between an account and a team. A membership is either **approved** or
waiting for approval, and **an unapproved membership grants nothing** — it is
indistinguishable from having no membership at all, except that the user can see
they have asked.

An approved membership is what makes someone able to score their own team's
matches. The rule the app applies is:

> A user may score a match if the match is not yet completed, **and** they are an
> admin **or** they have an approved membership of one of the two teams playing.

That single rule is mirrored in the browser and enforced in the database
independently. Requesting a membership is described in
[`getting-started/join-a-team.md`](../getting-started/join-a-team.md); approving
one is in [`admin/handle-requests.md`](../admin/handle-requests.md).

## How pages are gated

This is where the product is least consistent, and it is worth stating plainly.

**Only three routes are guarded at the route level:** `/admin`,
`/admin/notifications`, and `/timeslots`. Reaching any of them runs the same
check:

1. While authentication or the profile is still loading, the page shows a spinner
   and the words "Checking access...".
2. If nobody is signed in, the user is redirected to `/auth`, and the page they
   wanted is remembered so they can be returned to it.
3. If someone is signed in but is not an admin, a red toast says "Access Denied —
   You do not have admin privileges" and they are redirected to the home page.
   The toast is shown **once** per visit, not on every render.
4. Otherwise the page renders.

**Every other route is open.** `/my-team`, `/message-board`, `/setup-profile`,
and `/matches/:matchId/live` have no route guard at all. Each is responsible for
its own signed-out state, and they do not all handle it the same way. A live
match is deliberately public — anyone with the link can watch the score — and the
right to *edit* is decided inside the page by the rule above.

The consequence for a reader of these documents: "protected" is not a property of
a route in this app. Each document says what its own page does when nobody is
signed in.

## Signing in

Three ways in: email and password, registering a new account with email and
password, and Google. All three live on `/auth`; see
[`getting-started/sign-in-and-sign-up.md`](../getting-started/sign-in-and-sign-up.md).

The app watches the sign-in state continuously rather than checking once, so
signing in or out **in another tab** takes effect in this one without a reload.
The profile is re-fetched when the signed-in user changes, and a fetch that
finishes after the user has already changed again is discarded rather than
applied.

## Signing out

Ends the session. What the user sees next depends on where they were: a public
page stays where it is and simply stops showing signed-in controls, while a page
that needs a session behaves however that page handles being signed out — which,
given there is no shared guard, varies.

## Interactions with other systems

**Permissions and roles.** This document is the definition.

**Season scoping.** Accounts, profiles, and memberships are not season-scoped. A
membership approved in one season stays approved into the next.

**Validation and error display.** Sign-in failures are reported as toasts. The
database's own refusals — the ones that happen when the browser thought an action
was allowed and it was not — surface as ordinary failed writes, with the generic
message for that feature.

**Unsaved changes.** Not applicable.

**Optimistic updates and rollback.** The admin flag is read from the loaded
profile with no request of its own, so admin controls appear the instant the
profile does and never flicker.

**Realtime.** No subscription on profiles or memberships. An admin approving a
membership does not reach the waiting user's browser until they refetch, so the
user keeps seeing "waiting for approval" until they reload or come back later.

**Offline.** The session is held in the browser, so an offline user still appears
signed in and still sees signed-in controls. Every write fails.

**Toasts and notifications.** The only role-related toast in the app is "Access
Denied" on the three guarded routes. Being refused anywhere else produces
whatever message that feature produces for a failed write.

**URL state.** The remembered destination after a sign-in redirect is carried in
the navigation state, not the URL, so it does not survive a reload of the sign-in
page.

**On a phone.** Google sign-in has a separate native path for the app shell,
which is out of scope here. In mobile web it behaves as on desktop.

**Accessibility.** The redirect on being refused moves the user to a different
page without an announcement.

**Side effects the user can notice.** Registering sends a confirmation email.
Changes to who is an admin are recorded in an audit trail the user never sees.

## Edge cases

- **Signed in with no profile row at all.** Treated the same as a profile with no
  username: the user is sent to profile setup.
- **Signing out in another tab** takes effect here without a reload, and can
  remove controls under the user's cursor mid-action.
- **An approved membership of a team that is later hidden.** Nothing revokes the
  membership. What the user can then do is not obvious.
- **Two memberships.** The scoring rule reads a single membership. What happens
  for a user who belongs to two teams is not clear from the code.
- **Admin revoked while the page is open.** The browser keeps showing admin
  controls until the profile is refetched; the database refuses the writes in the
  meantime.
- **A guarded route reached by typing the URL while signed out** redirects to
  `/auth` and remembers the destination; reaching the same route via a link from
  inside the app does the same.
- **The "Access Denied" toast is shown once per visit.** Navigating to `/admin`
  twice in a row as a non-admin shows it twice, because each visit is a new mount.

## Open questions and verification

- **Unguarded pages that need a session are not consistent.** `/my-team` has no
  route guard and no obvious in-page signed-out branch; what a visitor sees there
  is not determinable from the code alone. **This may be worth treating as a bug
  rather than documenting**, and it is the first thing to check by hand.
- Not confirmed by hand: what `/message-board` and `/setup-profile` show to a
  visitor.
- Not confirmed by hand: what happens to a user with approved memberships of two
  teams that are playing each other.
- Not confirmed by hand: whether the post-sign-in redirect actually returns the
  user to the page they wanted, or drops them at the home page.
- Not confirmed by hand: whether an admin flag removed mid-session produces any
  visible message, or just silently failing writes.
- Assumption: there is no email-confirmation gate blocking use of the app before
  the confirmation link is followed. Not verified.

Verified against `717rec` commit `ea5c8f4`.
