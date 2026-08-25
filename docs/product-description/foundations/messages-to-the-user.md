# Messages to the user

## Summary

This document owns every way 717rec tells a user something: toasts, empty states,
loading states, the two error screens, and push notifications. Every other
document's "Toasts and notifications" and "Validation and error display"
paragraphs link here.

The one fact that matters most: **the app shows one toast at a time.** A second
message replaces the first rather than stacking beneath it, so two things
happening close together produce one message and the user never sees the other.

## The simple case

A user submits a score. A small panel slides in at the edge of the screen saying
it worked, waits about five seconds, and slides away. If it had failed, the same
panel would have appeared in red with a different message.

A page with nothing to show — an empty schedule, a team with no matches — shows
an icon, a short heading, a sentence, and sometimes a button, rather than a blank
area. A page still waiting for its data shows a spinner or a grey outline of the
content to come.

## Toasts

A toast is a short message at the edge of the screen that dismisses itself.
Toasts are the app's main way of reporting both success and failure.

There are two kinds. A plain toast reports success. A **destructive** toast is
styled as an error and reports failure. Each has a bold title and a sentence
under it: "Success — Message sent successfully!", "Error — Failed to send
message. Please try again."

**Only one toast is on screen at once.** Raising a second replaces the first
immediately, even if the first has been there only a moment. Two rapid actions —
a bulk operation reporting per-item, a page that both fails a read and fails a
write — produce one visible message, and it is the later one.

A toast dismisses itself after about five seconds, or when the user dismisses it.
Toasts are drawn once for the whole app rather than per page, so **a toast raised
on one page is still visible after navigating to another**. A user who submits
something and immediately navigates sees the result on the next page.

> **Technical note:** a dismissed toast is kept in memory for a very long time
> before being discarded. This is invisible to the user and has no effect on what
> is shown; it is mentioned only because it looks alarming in the code and is
> not a bug the user can meet.

### What a failed write should produce

Every write in the app goes through a service that throws on failure rather than
returning a quiet empty result — see
[`saving-and-freshness.md`](saving-and-freshness.md). So there is always an error
available to report.

That gives a rule these documents apply throughout: **a failed write with no
visible message is a defect.** Where a document describes a write whose failure
path is silent, it says so in its open questions.

### What a failure message says

Most failure toasts in the app are written per feature and are generic: "Failed
to load matches. Please try again." The underlying reason — refused by
permissions, rate-limited, invalid, unreachable — is generally not passed
through. The app has the specific message and discards it in favour of a fixed
sentence.

This is convenient to write and unhelpful to receive, and it is the same pattern
in most features. Where it produces advice that cannot be followed — telling a
rate-limited user to try again — the feature's document raises it.

## Empty states

A page or panel with no data shows an icon, a heading, a sentence, and up to two
buttons. "Page Not Found — Oops! The page you are looking for does not exist or
has been moved.", with Go Home and Go Back. "Match not found — This match does
not exist or was removed from the schedule."

**An empty state and a loading state are different and must not be confused.**
Empty means the data arrived and there is none. Loading means the app is still
waiting. Showing an empty state while still loading tells the user something
false; every document checks this for its own page.

## Loading states

Two shapes. A **spinner** with a message under it, used for whole pages and large
panels: "Loading page...", "Loading match…", "Checking access...". A **skeleton**,
a grey outline in the shape of the content, used inside pages where the layout is
known in advance.

Because the app keeps data it has already fetched for five minutes, a page
revisited inside that window shows no loading state at all.

## The two error screens

**The route error screen** replaces a page that failed to load or whose first
render threw. A warning triangle, "Failed to load *page name*", the sentence
"Something went wrong loading this page. You can try again or navigate
elsewhere.", and three buttons: Try Again, Go Back, Home. In a development build
the underlying error message is shown; in the published build it is not. See
[`navigation.md`](navigation.md#when-a-page-fails).

**The Page Not Found screen** is an ordinary empty state on a route that matched
nothing.

A failed *data* request produces neither. It is the page's own business and
becomes an empty state, a toast, or both.

## Push notifications

Messages delivered outside the app, which an admin can send. What triggers them,
who receives them, and what they say is in
[`admin/send-notifications.md`](../admin/send-notifications.md) and
[`cross-cutting/what-the-league-sees.md`](../cross-cutting/what-the-league-sees.md).

Nothing in the ordinary run of the app sends a push by itself. A score being
submitted, a membership being approved, or a match being scheduled produces no
notification to anyone.

## Modifiers

| Modifier | Set at arrival | Changed while editing |
| --- | --- | --- |
| The user's role | The "Access Denied" toast is the only message that exists solely because of a role. | An admin flag revoked mid-session produces no message; writes simply begin failing. |
| The record's state | No effect on how messages are shown. | No effect. |
| The season's state | No effect. A season changing over produces no message at all. | No effect. |
| Viewport | Toasts appear at the edge of the screen; on a narrow screen they span its width. | No effect. |
| Keys the app honours | A toast can be dismissed from the keyboard. | No effect. |

## Cancel and interrupt

| Event | Before the first edit | While editing or submitting |
| --- | --- | --- |
| Escape, or a Cancel button | Dismisses a toast if one is focused. | Does not stop a toast that is about to be raised by a request in flight. |
| In-app navigation away, or switching tab within the page | A visible toast survives the navigation. | **The result toast still appears, on whatever page the user is now on.** A success message can therefore appear over an unrelated page. |
| Browser back or forward | Same. | Same. |
| Reload, or the tab closed | Toasts are lost. | The result toast is never seen. The write may still have landed. |
| Network lost mid-request | Nothing to show. | The failure toast appears normally; toasts need no network. |
| The request fails or times out | Not applicable. | One destructive toast, generically worded. |
| The session expires | No message. | No message about the session. The user sees whatever failure message the refused write produces. |
| The same record changed in another tab, or by another user | No message. Nothing announces a change that arrives by realtime either. | No message. |
| Browser autofill or a password manager writes into the form | No message. | No message. |
| The window loses focus | No message. | Returning to the tab refetches stale data with no message, so numbers change silently. |

After an interrupt, any message the app wanted to give is either shown wherever
the user now is, or lost. Nothing is queued for next time.

## Interactions with other systems

**Permissions and roles.** One role-specific message exists: "Access Denied — You
do not have admin privileges", on the three guarded routes, shown once per visit.

**Season scoping.** No message is ever season-specific, and a season changeover
is silent.

**Validation and error display.** Field-level validation appears under the field,
inside the form. Server refusals do not; they become toasts.

**Unsaved changes.** No message anywhere warns about losing them.

**Optimistic updates and rollback.** A rollback is announced only by the failure
toast. The value changing back is otherwise unmarked.

**Realtime.** Nothing announces a realtime change. On live scoring the score
simply moves.

**Offline.** No message tells the user they are offline. They find out by a write
failing.

**Toasts and notifications.** Defined here.

**URL state.** No message state is in the URL.

**On a phone.** Toasts span the screen width. A toast covering a submit button at
the bottom of a small screen is possible.

**Accessibility.** Toasts are announced by screen readers. Empty states and
loading states are ordinary content and are not announced when they replace each
other, so a page moving from loading to empty is silent.

## Edge cases

- **Only one toast at a time.** A bulk action reporting per item shows only the
  last message. Anything that raises two toasts close together loses one.
- **A toast follows the user across pages**, and can appear over content it has
  nothing to do with.
- **A success toast and an in-page success panel can both appear** for the same
  action, as on the contact form, confirming the same thing twice.
- **A message the app has and does not show.** Server refusals carry specific
  reasons that are replaced with generic ones.
- **No message for going offline**, for a session expiring, for a season changing
  over, or for data updating under the user.
- **The route error screen's "Home" is a full page load**, unlike Home anywhere
  else.
- **Development builds show error details** that the published build hides, so a
  developer and a user report different things about the same failure.

## Open questions and verification

- **The single-toast limit loses messages.** Whether this is deliberate or
  inherited from the component library is not stated anywhere in the code. Its
  effect on bulk admin operations is worth checking by hand — see
  [`admin/enter-scores-in-bulk.md`](../admin/enter-scores-in-bulk.md). **May be
  worth treating as a bug rather than documenting.**
- **Server failure reasons are discarded almost everywhere.** This is a pattern
  rather than a single defect, and it is worth one triage entry rather than one
  per feature.
- Not confirmed by hand: the exact time a toast stays on screen. About five
  seconds is the component library's default and no override was found.
- Not confirmed by hand: whether toasts are announced by a screen reader in
  practice, and whether a replaced toast is re-announced.
- Not confirmed by hand: whether any page shows an empty state while still
  loading. This needs checking per page and is a P1 item in every checklist.
- Not confirmed by hand: what a push notification looks like when it arrives, or
  whether players can opt out.

Verified against `717rec` commit `ea5c8f4`.
