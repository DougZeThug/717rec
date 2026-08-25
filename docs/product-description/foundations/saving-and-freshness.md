# Saving and freshness

## Summary

This document owns what "saved" means in 717rec, how long the app keeps showing
data it already has, when it goes back for more, and what a user sees while a
write is in flight. Every other document's "Optimistic updates and rollback",
"Realtime", and "Offline" paragraphs link here.

The short version: **the app prefers showing something slightly old to showing a
spinner.** That is a deliberate choice and it has a visible consequence — numbers
change under the user with no action from them.

## The simple case

A user opens the standings. The app fetches them and shows them. The user goes to
the schedule and comes back a minute later: the standings appear instantly, with
no spinner, because the app still has them.

Ten minutes later they switch to another browser tab and come back. The standings
are still on screen, unchanged for a moment, and then quietly update — because
coming back to the tab made the app decide its copy was old enough to be worth
re-fetching, and it showed the old copy until the new one arrived.

When the user writes something — submits a score, posts a message — the control
they pressed goes dead until the league answers. If it worked, a toast says so
and the affected lists refresh. If it failed, a red toast says so and nothing
changed.

## How long data is kept

Every read in the app goes through one cache with one default: **data is
considered fresh for five minutes.** Within those five minutes the app will not
re-fetch it for any reason. After them, it will re-fetch on the next trigger,
while still showing the old copy.

A few things are cached longer on purpose. The season lists are cached for **ten
minutes**, which is why a season changeover can take up to ten minutes to reach a
user who is already looking at the app. See [`seasons.md`](seasons.md).

A few things are cached for **no time at all** and re-fetched on every trigger.
The pending matches list is one, because an admin acting on it needs to be
looking at the current state.

**A failed read is retried once**, then given up on. There is no long retry loop
and no exponential backoff on ordinary reads.

## What makes the app go back for more

- Returning to the browser tab after being away, if the data is older than its
  fresh window.
- Mounting a page that reads data the app does not have, or has and considers
  stale.
- A successful write explicitly telling the cache which lists it has invalidated.
  This is the main mechanism: after a score is submitted, the code names the
  queries that are now wrong and they re-fetch.
- A realtime message arriving, on the one screen that subscribes to them.

Nothing polls. The app never re-fetches on a timer.

## What "saved" means

**Saved** means the database accepted the write and said so. Until then, what the
user sees may be optimistic.

Every write in the app goes through a service function, and **those functions
always throw on failure — they never return an empty result or a false to mean
"it did not work"**. The consequence for a reader of these documents is useful:
wherever a write can fail, there is always an error available to report. If a
document describes a failing write that produces no message at all, that is a
defect, not a design choice.

## Optimistic updates

An optimistic update shows a change as though it succeeded before the league has
confirmed it, and rolls it back if the confirmation never comes.

The app uses them sparingly. Most writes simply disable their control and wait.
Where an optimistic update does exist, the pattern is the same: the display
changes at once, the request goes, and on failure the display returns to what it
was and a red toast explains. The rollback is silent apart from the toast — the
user sees a value change back with no other mark.

Each document says whether its own writes are optimistic. Where a document says
nothing, they are not.

## Realtime

Realtime means the league pushes a change to the browser without being asked.

**Only live scoring subscribes to anything.** On `/matches/:matchId/live` the
browser holds an open channel and receives games and rounds as they are entered
by whoever is scoring, which is what lets two phones at the same match stay in
step, and lets anyone else watch.

The connection looks after itself. If it drops, the app rebuilds it, waiting
longer between each attempt — one second, then two, then four, up to thirty
seconds, with a little randomness so several browsers do not all retry at once.
Every time it reconnects, it re-fetches the match rather than trusting that it
missed nothing while it was away. The screen shows the connection's state.

**Everywhere else in the app there is no realtime at all.** When an admin
approves a membership, changes a division, or activates a season, other people's
browsers do not find out. They keep showing the old value until something makes
them re-fetch: switching away from the tab and back, navigating to a page they
have not opened recently, or reloading.

This is the single biggest gap between what the app looks like it does and what
it does. A user watching the standings during league night is not watching them
update.

## Offline

**There is no offline write queue anywhere in the product.** Offline means
requests fail.

Data already fetched stays on screen. Pages already fetched still navigate.
Anything the user tries to write fails, reports whatever failure message that
feature has, and is lost. Nothing is stored to be sent later, and nothing warns
the user before they start typing that they will not be able to save.

The signed-in session lives in the browser, so an offline user still appears
signed in and still sees every control they would normally see, right up to the
moment they press one.

## Modifiers

| Modifier | Set at arrival | Changed while editing |
| --- | --- | --- |
| The user's role | No effect on caching. A role does change which queries run, so an admin's page fetches more. | Signing out does not clear the cache of what was already read. |
| The record's state | No effect on caching. | No effect. |
| The season's state | Season data is cached for ten minutes rather than five. | A season activated elsewhere does not reach this browser for up to ten minutes. |
| Viewport | No effect. | No effect. |
| Keys the app honours | No effect. | No effect. |

## Cancel and interrupt

| Event | Before the first edit | While editing or submitting |
| --- | --- | --- |
| Escape, or a Cancel button | No effect on the cache. | Does not abort a request in flight. No write in the app can be cancelled once sent. |
| In-app navigation away, or switching tab within the page | The cache is kept; returning is instant. | **The request still completes.** The write lands, the toast is never seen, and the cache invalidation still runs — so the change appears next time the user looks, with no explanation of when it happened. |
| Browser back or forward | Cache kept. | As above. |
| Reload, or the tab closed | **The whole cache is lost.** Every page re-fetches from scratch. | A sent request still lands. An unsent one is gone. Nothing tells the user which. |
| Network lost mid-request | Nothing to lose. | The request fails and is retried once for a read, not at all for a write. Nothing is queued. |
| The request fails or times out | A failed read is retried once, then the page shows its own empty or error state. | A failed write reports through that feature's message and rolls back anything optimistic. |
| The session expires | Reads of public data still work. | Writes fail. The cache still holds data read while signed in, so the app keeps *looking* signed in. |
| The same record changed in another tab, or by another user | On live scoring the change arrives. Everywhere else it does not, and the user keeps the old value. | Same. Two people editing the same thing outside live scoring will overwrite each other with no warning and no sign that it happened. |
| Browser autofill or a password manager writes into the form | No effect on the cache. | No effect on the cache. |
| The window loses focus | Nothing. | **Returning refetches anything past its fresh window.** A number can change under the user's cursor the moment they come back to the tab. |

After an interrupt, whatever reached the database is what happened. The app makes
no attempt to reconcile a user's screen with a write it never saw the answer to.

## Interactions with other systems

**Permissions and roles.** The cache does not know about roles. Data read as an
admin stays in the cache after admin is revoked, until it goes stale.

**Season scoping.** Season lists are the app's longest-lived cache at ten
minutes.

**Validation and error display.** Failures always throw and always have a
message; whether that message reaches the user is up to each feature.

**Unsaved changes.** Nothing anywhere protects them.

**Optimistic updates and rollback.** Defined here.

**Realtime.** Defined here. Live scoring only.

**Offline.** Defined here. No queue.

**Toasts and notifications.** Every failed read and every failed write is counted
for the league's own monitoring, whether or not the user is shown anything.

**URL state.** Nothing about freshness is in the URL.

**On a phone.** A mobile browser suspending a background tab means the tab's data
is stale on return, so the refetch-on-return behaviour is much more noticeable on
a phone.

**Accessibility.** Data changing under the user is not announced. A screen reader
user has no way to know a number just moved.

**Side effects the user can notice.** Completing a match starts badge processing
and power score recalculation on the server, and those finish some time after the
write. A user who looks immediately sees the match completed but the numbers not
yet moved.

## Edge cases

- **The five-minute window is per piece of data, not per page.** One page can
  show a fresh number beside a stale one.
- **A write that succeeds after the user navigates away** still invalidates its
  lists, so the change appears later with no explanation.
- **A reload is the only way to be certain** of seeing current data.
- **Two admins editing the same record** outside live scoring silently overwrite
  each other.
- **An offline user can fill in a long form** and lose all of it on submit.
- **Reconnecting to live scoring re-fetches the whole match**, so a brief drop is
  invisible; a long one shows the connection state changing.
- **The pending matches list is never cached**, so it always costs a request.

## Open questions and verification

- **No warning before an offline user starts writing.** Whether this matters
  depends on how often the league is scored on a bad connection at a venue,
  which is exactly the situation live scoring is for. Worth raising as a product
  question rather than a bug.
- Not confirmed by hand: which writes in the app are actually optimistic. The
  pattern was read from the mutation code; the list per feature is filled in by
  each feature's own document.
- Not confirmed by hand: how visible the refetch-on-return is — whether numbers
  visibly flicker or change without any transition.
- Not confirmed by hand: what the live scoring connection indicator actually
  shows in each state.
- Not confirmed by hand: whether a browser tab suspended for a long time on a
  phone recovers cleanly or shows stale data indefinitely.
- Assumption: nothing polls. No interval-based refetch was found, but a
  feature-level one could exist that this pass did not reach.

Verified against `717rec` commit `ea5c8f4`.
