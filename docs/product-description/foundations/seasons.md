# Seasons

## Summary

A season is a named run of the league from a start date to an end date. It is the
single most load-bearing idea in the product: **almost every number the app shows
is scoped to one season**, and which season that is, is decided for the user
rather than by them.

There is no season picker in the app's navigation. Pages that show current
information show the **active season**, and there is at most one of those at a
time. Older seasons are readable only through the history pages, and they are
frozen.

This document owns the season's flags, its lifecycle, and the rule about
scoping. Other documents link here rather than restating it. It has no
interaction of its own — activating and archiving are admin actions, described in
[`admin/manage-seasons.md`](../admin/manage-seasons.md) — so it drops the
event-by-event, modifiers, and cancel-and-interrupt sections.

## The simple case

A user opens the app and sees this week's schedule, the current standings, and
their team's record. None of those pages asks which season is meant. All of them
show the active season, because exactly one season is marked active and that is
the one the app treats as "now".

When the league finishes a season, an admin archives it and activates the next
one. From the user's point of view, the whole app changes at once: the schedule
empties and refills, standings reset, and every team's record goes back to 0-0.
The old numbers are not lost — they move to the history pages — but they stop
being what the app means by "your record".

## The four flags

A season carries four independent true-or-false flags. They are not a status
field and they are not mutually exclusive, so a season can be in combinations
that do not obviously make sense.

| Flag | What it means to the user |
| --- | --- |
| **Active** | This is the season the app means by "now". At most one season has it. Pages that do not name a season show this one. |
| **Archived** | The season is finished and frozen. Its numbers no longer move, even when the formula that produced them changes. It appears in history. |
| **Confirmation open** | Teams can confirm their place for this season. When it is off, the confirmation controls are **absent**, not disabled — the user sees nothing rather than something greyed out. |
| **Playoffs active** | The playoffs page shows a live bracket instead of a placeholder, and the regular season stops being the centre of the app. |

A season also stores its own **champion**, **runner up**, and **third place**
teams. These are written when the playoffs finish and are what the history pages
and the champion badges read from.

## What "frozen" means

An archived season's numbers are deliberately immune to later changes in how
numbers are calculated. When the league changes a division's weight, or changes
the power score formula, active-season numbers move and archived-season numbers
do not.

The freeze covers the **raw scoring rows** as well, not only the numbers computed
from them. An archived season's rounds and games are shown in the admin's Live
Corrections panel and cannot be changed there: the controls are absent and the
write is refused. This was not always true — see
[B-20](../bug-triage.md#b-20-archived-seasons-are-editable-through-live-corrections).

Two things the freeze still does **not** cover, deliberately: a season's name and
dates can be edited like any other's, and the bulk Scores tool is not
season-scoped.

This is a real product decision with a visible consequence: **two seasons' power
scores are not always directly comparable**, because they may have been produced
by different formulas. Nothing in the app warns the user about this. See
[`stats/power-score.md`](../stats/power-score.md).

> **Technical note:** freezing is done by backfilling the archived season's
> stored numbers once and then refusing to recompute them. An admin has controls
> that can override the freeze and rewrite an archived season, which is the only
> way an archived number ever changes.

## What is scoped to a season, and what is not

**Season-scoped** — these silently mean "in the active season" unless the page
says otherwise:

- A team's record, its standings position, and its place in a division
- A team's power score
- The schedule and every match on it
- Badges earned for results
- Per-team and per-player statistics

**Not season-scoped:**

- A team's identity. The same team persists across seasons, which is what makes
  career numbers possible.
- A player, a profile, and an account.
- Divisions and their names. Division *weights* are versioned over time rather
  than per season.
- The message board.
- Career power score, career records, and head-to-head, all of which look across
  every season and say so.
- The contact form, which is the only page in the app attached to no season at
  all.

## Weeks

Matches are grouped into weeks for display. A week is **worked out from the
match's date against the season's start date**; it is not stored on the match.

The consequence is that moving a match's date moves it to a different week in
every list that groups by week, with no other action needed and no record that it
moved.

## Interactions with other systems

**Permissions and roles.** Reading seasons needs nothing. Creating, activating,
and archiving are admin-only and live in
[`admin/manage-seasons.md`](../admin/manage-seasons.md).

**Season scoping.** This document is the definition.

**Validation and error display.** Nothing stops a season being created with dates
that overlap another season's, and nothing warns when it happens.

**Unsaved changes.** Not applicable.

**Optimistic updates and rollback.** Not applicable to reading seasons.

**Realtime.** No subscription. When an admin activates a different season, other
users' browsers do not find out until they refetch. Because the season lists are
cached for ten minutes — twice the app's usual five — a user can be looking at
the wrong season for up to ten minutes after a changeover without any sign that
anything has happened. See
[`saving-and-freshness.md`](saving-and-freshness.md).

**Offline.** Not applicable.

**Toasts and notifications.** A season changing over produces no notification to
players. The app changes under them silently.

**URL state.** The active season is never in the URL. A link to `/standings` or
`/schedule` means "whatever season is active when you open it", so a link shared
in one season shows different content in the next. Only history pages address a
named season.

**On a phone.** No difference.

**Accessibility.** No difference.

**Side effects the user can notice.** Activating a season can partially archive
the previous one, which recalculates stored statistics. Numbers therefore keep
moving for a while after a changeover.

## Edge cases

- **No active season.** Possible. Pages that expect one show empty states rather
  than errors. What each page shows in this state is not consistent and is worth
  checking per page.
- **Two active seasons.** The schema does not appear to prevent it. What the app
  shows if it happens is undefined — most reads take the first row they find.
- **Active and archived at the same time.** The flags are independent, so this is
  possible and is probably a mistake when it happens.
- **Playoffs active on an archived season.** Also possible for the same reason.
- **A match dated outside its season's start and end dates** still belongs to the
  season, and its computed week number can be zero or negative.
- **A season with no teams** shows empty standings, not an error.

## Open questions and verification

- Not confirmed by hand: what the home page, the schedule, and the standings show
  when there is no active season. Each is likely different and each is worth an
  item in the verification checklist.
- Not confirmed by hand: whether the database enforces at most one active season,
  or whether that is only a convention the admin tools follow. **If it is only a
  convention, it may be worth treating as a bug rather than documenting.**
- Not confirmed by hand: how long, in practice, a user keeps seeing the old
  season after a changeover. The ten-minute cache is read from the code.
- Not confirmed by hand: whether anything in the app tells a user that a season
  has changed over.
- Assumption: "confirmation open" refers to teams confirming their place for a
  coming season. The flag's use in the UI was read from the admin components, not
  observed.

Verified against `717rec` commit `ea5c8f4`.
