

## Add Record to Team Row + Game Record to Grid

### Changes — `src/components/stats/RankingCard.tsx`

**1. Team row (lines 194-212)**: Add the match record (`W-L`) as a bold element on the right side of the team row, across from the logo+name:

```text
[logo] Team Name          2-4
       Division Name
```

- Change the Link wrapper to include `justify-between`
- Add a large bold record display on the right: `text-base font-bold`

**2. Stat grid (lines 222-247)**: Remove "Record" from the grid (it's now in the team row) and replace with "Games" showing `gamesWon-gamesLost`. Keep the 2x2 layout:

| Win % | SOS |
| Games | Game % |

Where "Games" shows `{ranking.gamesWon}-{ranking.gamesLost}` (individual game record).

### Files
- **Edit**: `src/components/stats/RankingCard.tsx` (lines 194-247)

