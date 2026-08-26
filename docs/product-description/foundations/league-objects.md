# League objects

## Summary

This document defines the things 717rec is about, in the order a user meets
them: the league, a season, a division, a team, a player, a match, a game, a
round, a timeslot, and a bracket. Every other document uses these words with
exactly these meanings and links here rather than redefining them.

This is a reference document, not a screen. It has no interaction of its own, so
it drops the event-by-event, modifiers, and cancel-and-interrupt sections of the
standard template. Everything it describes is owned here: where a number or a
rule appears below, no other document restates it.

## The simple case

A recreational cornhole league runs a **season**. The season has **teams**, split
into **divisions** by ability. Teams play **matches** against each other on a
weekly **schedule**, at **timeslots**. Each match is best of three **games**, and
each game is played as a series of **rounds**. When enough matches have been
played, the top teams enter a **bracket** and play off for the title.

That is the whole product. Everything else — standings, power scores, badges,
history, the message board — is derived from those objects or attached to them.

## The objects

### The league

There is one league. It is not a record anywhere; it is the app. Nothing in the
product supports a second league, a second organisation, or a second set of
rules. Where a document says "the league", it means either the app itself or the
people who run it, and the sentence makes clear which.

### Season

A named run of the league with a start date and an end date. See
[`seasons.md`](seasons.md), which owns the season's flags and its lifecycle.

The important fact for every other document: **almost every number in the app is
scoped to one season.** A team's record, its power score, its standings position,
and its badges all silently mean "in this season". The exceptions are *career*
numbers and *head to head*, which look across seasons and say so.

### Division

A competitive tier. The league runs four: **Recreational**, **Intermediate**,
**Competitive**, and **Hidden**.

A division carries a **division weight**, a number used to rate how hard it is to
beat a team from that division. Weights are **versioned over time**: a match is
rated against the division its opponents were in *on the date of that match*, not
the division they are in today. This is what stops an archived season's numbers
moving when the league re-tiers a team.

**Hidden** is not a tier anyone competes in. It is where teams go when they stop
playing. A hidden team vanishes from the teams list and the standings, but its
past matches still count for everyone who played it. Hiding is not deleting, and
the distinction matters: deleting a match reverses the statistics it produced,
hiding a team does not.

### Team

The unit that plays. A team has a name, a division, a roster, a record, and a
power score.

A team persists across seasons. That is what makes **career** numbers possible: a
team that played three seasons has one career record and three season records,
and the two kinds of number are computed separately and can disagree.

A team can opt out of a season without being deleted or hidden.

### Player

A person on a team's roster. A player is a row that **may or may not be linked to
a signed-in account**. Someone can appear as a player, be recorded as throwing in
rounds, and accumulate statistics, without ever having visited the app.

This is the single most common source of confusion in the product: *player* and
*account* are different things. A signed-in account has a
[profile](accounts-and-roles.md); a player has a roster entry. They are joined by
a **membership** only when someone asks to join a team and an admin approves it.

A side in a game has **at most two players**.

### Match

One scheduled meeting of two teams, on a date, at a location. A match is the unit
that appears on the schedule, and the unit that produces a result.

**A match is best of three games. Two game wins takes the match.**

A match is either completed or not. A completed match has a winner, a loser, and
the game wins for each side. Completing a match is the event that moves
standings, power score, and badges — nothing else does.

A match with no winner recorded but marked completed is a **tie**, and a tie
needs an admin decision. It sits in the pending list until one is made. See
[`scores/pending-scores.md`](../scores/pending-scores.md).

A match may also belong to a **bracket**, in which case it carries its round
number, its position, and which match the winner and loser feed into next.

### Game

One leg of a match, numbered 1, 2, and 3.

**A game is first to 21 points, and it must be won by two.** There is **no bust
rule** and **no hard cap**. A game tied at 20–20 continues until one side leads by
two, at 30–28 or 44–42 or anywhere else. Nothing in the product ends a game any
other way.

> **Technical note:** these three numbers — 21, win by 2, no cap — are defined in
> exactly one place in the code, with a comment recording that they were
> confirmed with the league admin. If the league changes its rules, that is the
> one place to change, and every document that quotes 21 links here.

A game is in progress or completed. A completed game has a winning side.

### Round

One exchange inside a game: both sides throw, and the difference decides the
score. Rounds are numbered from 1 within each game.

**Only one side scores in a round.** The round records each side's points, and
the difference between them is the round's **net points**. A round where both
sides throw equally well scores nothing for either.

A round can also record, for each side, how the bags landed: **bags in** the
hole, **on** the board, and **off** the board, and **which player threw**. This
detail is optional — a round can be entered by points alone — and it is what
per-player statistics are built from. A league that never records it still gets
working team statistics and no player statistics.

### Timeslot

A named slot a match can be scheduled into. Teams state which timeslots they can
play; see
[`schedule/timeslot-preferences.md`](../schedule/timeslot-preferences.md).

A preference is a **preference, not a constraint**. The schedule can place a team
outside the timeslots it asked for, and nothing in the app prevents that or warns
about it.

### Bracket

The playoff structure for a season: a tree of matches where the winner of one
feeds into the next, and in a double-elimination bracket the loser feeds into
another.

Brackets are built with an external library rather than by hand, which means the
bracket's own rules about byes, seeding, and progression are that library's rules
and not the league's. See
[`playoffs/read-a-bracket.md`](../playoffs/read-a-bracket.md).

A match in a bracket is one of **winners**, **losers**, or **finals**, and a
playoff match may additionally be a **play-in** or a second play-in, used when
the number of qualifying teams is not a power of two.

**Blind draw** is a different thing entirely: players sign up as individuals and
are paired at random, rather than playing on their season team. It has its own
signups and settings. See
[`playoffs/blind-draw-signup.md`](../playoffs/blind-draw-signup.md).

## Interactions with other systems

**Permissions and roles.** None of these objects is visible only to some roles,
with one exception: hidden teams are filtered out of the lists a visitor or
player sees, and admins see them. What a role may *change* is a different
question, answered in
[`cross-cutting/permissions.md`](../cross-cutting/permissions.md).

**Season scoping.** Teams, matches, and standings are season-scoped. Divisions
and their weights are not — they are league-wide, and versioned over time
instead. Players and profiles are not season-scoped either.

**Validation and error display.** No object described here is validated in the
browser alone; the database holds the real rules. Where the two disagree, the
browser is the one that is wrong.

**Unsaved changes.** Not applicable; nothing here is edited directly.

**Optimistic updates and rollback.** Not applicable here. See
[`saving-and-freshness.md`](saving-and-freshness.md).

**Realtime.** Only games and rounds have realtime subscriptions, and only on the
live scoring screen. Every other object changes under the user silently, or not
until a refetch.

**Offline.** Not applicable here.

**Toasts and notifications.** Not applicable here.

**URL state.** Only two of these objects have their own address: a team, at
`/teams/:teamId`, and a match being scored live, at `/matches/:matchId/live`.
There is no page for a single game, a single round, a division, or a timeslot.

**On a phone.** Not applicable here.

**Accessibility.** Not applicable here.

**Side effects the user can notice.** Completing a match sets off badge
processing and power score recalculation on the server, so numbers elsewhere in
the app change some time after a score is entered rather than instantly.

## Edge cases

- **A team with no players** is possible. It can be scheduled and can appear in
  standings; it just cannot record who threw.
- **A player on two teams** is possible in the data. Nothing in the product
  prevents it, and what it means for player statistics is not obvious.
- **A match with only one team assigned** is possible while a schedule is being
  built. Live scoring refuses to open for it and says "Teams not set".
- **A game past 21** is normal, not an error. A user seeing 26–24 is seeing the
  win-by-two rule working.
- **A round with zero net points** is normal and is recorded like any other.
- **A hidden team's past opponents keep their results.** Hiding is retroactively
  invisible in listings but not in history.
- **An archived season's numbers are frozen** even when the formula that produced
  them changes. Two seasons' power scores are therefore not always comparable.

## Open questions and verification

- Not confirmed by hand: whether the app anywhere prevents the same player being
  added to two teams in one season, or what the statistics pages do when it
  happens.
- Not confirmed by hand: what a bracket does when a play-in is needed but seeds
  have not been set.
- The four division names above are the ones the code and its migrations use.
  Not confirmed by hand that these are the names the league currently shows, or
  that there are exactly four.
- Assumption: "the league" has no plans for a second organisation. Nothing in the
  schema allows one, so every document is written as though there is exactly one.

Verified against `717rec` commit `ea5c8f4`.
