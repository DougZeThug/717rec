# Browse teams

## Summary

`/teams` is the league's directory. It lists every team playing this season, with
its record and its power score, and every entry is a way into that team's page.

It is the only page in the app with **display preferences that survive**: how the
teams are laid out, whether they are grouped by division, and how they are
sorted are remembered in the browser between visits. They are remembered per
browser, not per account, and they are never in the address, so the choice
cannot be shared or linked to.

It also **remembers where the user was scrolled to** and puts them back when they
come back with the browser's Back button. In a 2026-11-06 test in headless Chromium
against fake data it did so in every run tried; the interrupt table has the
numbers.

## The simple case

The user opens `/teams`. A heading reads **TEAMS**, with the line "Browse all
teams or view by division" beside it on a wide screen. Under it are two pairs of
buttons: **Grid / List**, and **All Teams / By Division**.

Below that, a grid of small cards, one per team, sorted by power score. Each
card has the team's logo, its name, a division badge, its record, and its power
score. Clicking any of them opens that team's page.

The user opens a team, reads it, and presses Back. `/teams` returns with the
same layout and the same grouping, and at the same scroll position: in the
2026-11-06 test it landed within 1 pixel of where the user had left.

## The interaction, event by event

```mermaid
stateDiagram-v2
    [*] --> loading : arrive at /teams
    loading --> listed : teams arrive
    loading --> failed : the read fails and nothing is cached
    listed --> listed : change layout, grouping, or sort (saved in the browser)
    listed --> division_open : By Division — open one division
    division_open --> listed : close it
    division_open --> division_open : open another (the first one closes)
    failed --> loading : press Try Again
    listed --> [*] : open a team
```

### Arrive

Three preferences are read from the browser before anything is drawn:

| Preference | Choices | First-ever default |
| --- | --- | --- |
| Style | Grid, List | Grid |
| View | All Teams, By Division | **By Division** on a phone, **All Teams** on a wide screen |
| Sort | Rank, A-Z | Rank |

After the first visit the stored choice always wins, including the grouping —
so a user who chose "All Teams" on a wide screen keeps it if they later narrow
the window, and a phone that has been used once keeps whatever was chosen then.

Then the teams are fetched. **Hidden teams are removed**; see
[`foundations/league-objects.md`](../foundations/league-objects.md). Everything
else is listed, in every division, with no paging and no limit.

While the fetch is in flight the page shows three placeholder cards in the
chosen style. Nothing is focused and nothing is prefilled.

Arriving does write something, quietly: the three preferences are saved back to
the browser on the first render, whether or not the user touches anything.

### Leave without changing anything

The preferences are already saved. The scroll position is saved continuously
while the page is open, under the name of this route. A scroll event that arrives
as a link is clicked, after the address has changed, is not saved, so the saved
spot is the one the user left from.

Nothing else is recorded, and no draft of anything is kept.

### Begin editing

There is nothing to edit here. "Editing" on this page means changing one of the
three preferences, and each takes effect immediately: the list fades out and
back in, re-sorted or re-grouped, and the choice is written to the browser at
once. There is no Apply and no Cancel.

**Sort is only reachable on a narrow screen.** On a phone the three preferences
are compact dropdowns reading `Sort: Rank · View: By Division · Style: Grid`. On
a wide screen only Style and View are drawn, so a desktop user cannot change the
sort at all and is left with whatever a phone last chose, or Rank. See
[Open questions](#open-questions-and-verification).

### While editing

**All Teams** draws one flat grid or list of every team.

**By Division** draws one collapsible section per division, each headed with the
division's name and the number of teams in it, and **only one can be open at a
time** — opening a second closes the first. Opening a section scrolls it to just
below the top of the window, smoothly, which moves the page under the user; the
division that starts open does not, so arriving on the page never moves it.

One division starts open, as soon as the teams have loaded. Which one is not
chosen: it is whichever non-empty division happens to come first, which follows
from the alphabetical order the teams arrive in. A visitor who closes it is not
overruled — the page does not re-open it.

Sorting applies inside each division as well as across the whole list. Rank
sorts by power score, highest first, treating a team with no power score as
zero. A-Z sorts by name, ignoring case.

The address never changes. `/teams` is `/teams` in every combination.

### Submit

Nothing is submitted. This page only reads.

Two write actions exist on the cards and both are **admin only**: **Edit** and
**Delete**, in the "…" menu on each card. They belong to
[`admin/manage-teams-and-divisions.md`](../admin/manage-teams-and-divisions.md).
The menu itself is drawn for everyone; for a visitor or a player it contains one
item, **View Details**.

## Modifiers

| Modifier | Set at arrival | Changed while editing |
| --- | --- | --- |
| The user's role | Decides only what is inside each card's "…" menu. An admin gets Edit and Delete above View Details; everyone else gets View Details alone. The list itself is identical for all three roles. | Admin granted or revoked elsewhere reaches this page as soon as the profile reloads, and the menu items appear or disappear under the cursor. |
| The record's state | A hidden team is not listed at all. A team with no players, no matches, or no power score is listed like any other. | A team hidden elsewhere stays on screen until this page refetches. |
| The season's state | The list is not filtered by season; it is every team the league has, minus hidden ones. Records and power scores on the cards are the active season's. | A season changeover changes every record on the page at the next refetch, with no sign that it has happened. |
| Viewport | Decides the first-ever grouping default, the card layout, and whether Sort can be changed at all. On a phone a **grid** card shows only the logo, the name, and the record; the division badge, the power score, and the "…" menu are all dropped. A **list** card keeps everything, menu included. | Re-flows on rotation. The stored preferences do not change, so a window resized past the breakpoint keeps the grouping it had. |
| Keys the app honours | No shortcuts. Tab reaches the preference buttons, then each card's picture, name, and menu in turn. | Enter opens the focused link. Escape closes an open preference dropdown or card menu. |

## Cancel and interrupt

| Event | Before the first edit | While editing or submitting |
| --- | --- | --- |
| Escape, or a Cancel button | No effect. There is no Cancel on this page. | Closes an open dropdown or card menu. It does not undo a preference that has already been chosen — there is no undo. |
| In-app navigation away, or switching tab within the page | Preferences are already saved. The scroll position is saved too, and was right at the moment of leaving in every 2026-11-06 run (on this page the code before the fix saved it right as well: 5 of 5 after a team link and 3 of 3 after the bottom tab bar; the overwrite with a smaller number was measured on `/history`). An open division is not: coming back opens the default one again. | Same. No request is ever in flight from this page except the initial read. |
| Browser back or forward | **Back into `/teams` restores the scroll position.** Measured 2026-11-06 (fake data, headless Chromium, 390 pixels wide): within 1 pixel in 5 of 5 runs at an offset of 304 pixels and in 5 of 5 runs across offsets of 100, 200 and 250 (two, two and one runs); after the Schedule tab of the bottom tab bar, then Back, 3 of 3. The page jumps to the saved spot, holds it for up to three seconds, and stops at once when the reader scrolls (a wheel turn, a touch, a key press or a mouse press). Three other routes (`/stats`, `/history`, `/insights`) run the same code. Forward is the same kind of move; it was not measured in a browser and is covered by unit tests only. Safari and iOS were not tested. | Same. |
| Reload, or the tab closed | Preferences survive; they are stored in the browser. Scroll position survives a reload (300px before, 300px after in the 2026-11-05 test). A closed tab was not tested. The open division does not. | Same. |
| Network lost mid-request | Nothing loads. In **By Division** the page shows "We couldn't load the teams. Please try again." with a Try Again button. In **All Teams** the same message appears only when nothing was cached; if a stale list is held, it is shown instead with no warning that it is old. | Preferences still save; they never touch the network. |
| The request fails or times out | The read is retried once, then one of the two states above. | As above. |
| The session expires | No effect. The list is public. | No effect. |
| The same record changed in another tab, or by another user | No realtime. A renamed team, a re-tiered team, or a newly hidden team does not reach an open page until a refetch. | Same. Two tabs can hold two different lists, and the preferences written by the last one to change win. |
| Browser autofill or a password manager writes into the form | No effect. There are no fields. | No effect. |
| The window loses focus | Nothing. | **Returning refetches the list if it is over five minutes old.** Records and power scores can change, and with Rank sorting the cards can re-order under the cursor. |

After an interrupt the user gets the page back with the layout and scroll they
left, and a list that may have moved on.

## Interactions with other systems

**Permissions and roles.** Reading needs nothing. Editing and deleting are
admin-only and hidden rather than disabled. See
[`cross-cutting/permissions.md`](../cross-cutting/permissions.md).

**Season scoping.** The teams are not season-scoped; the numbers on them are.
See [`foundations/seasons.md`](../foundations/seasons.md).

**Validation and error display.** No input, so no validation. Failures become an
in-page card with a Try Again button rather than a toast.

**Unsaved changes.** None exist. Every preference is saved the moment it is
chosen.

**Optimistic updates and rollback.** None on this page.

**Realtime.** None.

**Offline.** A list already fetched stays on screen and every team link still
navigates, because the team pages fetch their own data and will fail there
instead.

**Toasts and notifications.** None from browsing. Deleting a team raises one;
that belongs to the admin document.

**URL state.** None. The style, the grouping, the sort, and the open division
are all invisible to the address, so no arrangement of this page can be shared,
bookmarked, or reached by a link.

**On a phone.** Grid cards drop to two per row and carry only a logo, a name,
and a record, with no "…" menu — so an admin on a phone must switch to List
before they can edit or delete. Grouping defaults to By Division on a first
visit.

**Accessibility.** Each card's picture, name, and menu are separate links, so
every team is reached three times by Tab. Each division header is a single
button carrying the division's name and team count, its expanded state, and the
identity of the list it opens, so it can be reached by Tab and a screen reader
is told when a section opens or closes. The smooth scroll on opening a division
is not offered as a preference.

**Side effects the user can notice.** Three preference values are written to the
browser on arrival even if nothing is touched. Nothing is sent to the league.

## Edge cases

- Resolved: **the empty state described filters that do not exist**, and its
  "View All Teams" button did a full browser load of the same address. Both fixed
  — see [B-30](../bug-triage.md#b-30-small-copy-and-labelling-slips). With no
  teams the page now reads "No Teams Found — There are no teams to show yet. An
  admin adds teams from the admin dashboard.", and there is no button.
- **In By Division mode an empty league reads differently**: "No teams available
  in any division."
- **A division that exists but has no teams is not drawn at all**, so the set of
  headings changes as teams move between divisions.
- **Opening a division scrolls the page.** On a short list this can scroll past
  the heading and the preference buttons. The division that is open on arrival
  is exempt, so a first load leaves the page at the top.
- **Ranking by power score mixes divisions in All Teams mode.** There is no
  division ordering; a Recreational team can appear above a Competitive one.
- **A team with no power score reads "N/A" on a wide grid card** but sorts as
  zero.
- **Team links are built from the team's name**, not its id, so renaming a team
  changes its address and breaks any link or bookmark to the old one. Two teams
  whose names reduce to the same address would collide; see
  [`team-details.md`](team-details.md).
- **A hidden team is still delivered to the browser** and then removed before
  drawing. Hiding a team keeps it out of the list; it does not keep it secret.

## Open questions and verification

- **Sort can only be changed on a narrow screen.** A desktop user has no sort
  control at all, and is stuck with Rank unless the same browser was once used at
  phone width. **May be worth treating as a bug rather than documenting.**
- **The stored grouping ignores the screen it is used on after the first visit.**
  The phone-friendly default only applies when nothing has been stored, so the
  intended mobile default is lost as soon as a user changes anything anywhere.
  Worth a product decision rather than a fix.
- Settled: four routes run the scroll restoration (`/teams`, `/stats`, `/history`,
  `/insights`), as [`foundations/navigation.md`](../foundations/navigation.md#arrive)
  now says.
- **Measured on this branch, not yet live: the scroll restoration lands on
  `/teams`.** On 2026-11-05 (production build, fake data, scrolled 300px down a
  1,080px page) Back after a team, Help or Schedule came back at the top. A probe on
  `/stats`, which runs the same code, showed the saved position overwritten with 0
  as the page was left. The code now ignores scroll events after the address changes. The 2026-11-06 runs on the old code did not show that overwrite on `/stats` (the saved offset was right 1 of 1 after a team link and 3 of 3 after the Schedule tab), so the probe was not reproduced and its cause is not known. On 2026-11-06 a test on
  `/teams` landed within 1 pixel in every run; the numbers are in the
  interrupt table above and in
  [navigation](../foundations/navigation.md#open-questions-and-verification). The
  2026-11-06 scripts on the code before the fix gave 5 of 5 at 304 pixels after a team
  link, which does not match the 2026-11-05 result, and 0 of 3 after the Schedule tab
  of the phone's bottom tab bar (the page landed at 86 pixels although the saved
  offset was right), which agrees with it in kind. What differed between the two days
  is not known. While the page is
  still too short to reach the saved spot the code retries with increasing gaps for
  roughly fifteen seconds before giving up. Not tried: a very long list, and Forward
  in a browser.
- Not confirmed by hand: whether the division that opens first looks arbitrary
  to a user.
- Not confirmed by hand: what a very long team name does to a phone grid card,
  where names are truncated.
- The page's own test replaces the whole list with a stub, so everything above
  about layout, grouping, and sorting is read from the components rather than
  from a passing test.
- Assumption: the preferences are meant to be per browser rather than per
  account. Nothing stores them against a profile.

Verified against `717rec` commit `ea5c8f4`.
The scroll behaviour changed after that commit: a link now opens the new page at the top ([B-14](../bug-triage.md#b-14-scroll-position-carries-across-every-in-app-navigation)). It was measured in a real browser against fake data on 2026-11-05; see [navigation](../foundations/navigation.md#open-questions-and-verification).
The restore of the scroll position on Back changed again on this branch (not yet live) and was measured on 2026-11-06; the summary, the simple case, the interrupt table and the open questions describe it.
