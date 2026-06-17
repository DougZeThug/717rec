## Goal
Insert 16 rows into `playoff_matches` for bracket **Competitive Spring 2026** (`43fca940-1e6e-450e-9992-b05e7c61ec6b`) so team stats update correctly. All matches Best of 3, status `completed`.

Please verify the scores below before I run the inserts.

### Winners Bracket
| # | Round | Match | Seed | Team | Score | Winner |
|---|---|---|---|---|---|---|
| 1 | WB R1 | Play-in | 8 Pepperoni Cheesers vs 9 Bumbleweed | 1–2 | Bumbleweed |
| 2 | WB R2 | M5 | 1 Degeneration X vs 9 Bumbleweed | 2–0 | Degeneration X |
| 3 | WB R2 | M2 | 4 Cuzzo's Clinic vs 5 Cornelius Bag | 2–0 | Cuzzo's Clinic |
| 4 | WB R2 | M3 | 2 Seize the Maize vs 7 3 Amigos | 0–2 | 3 Amigos |
| 5 | WB R2 | M4 | 3 Hole Violators vs 6 Hole Burners | 2–1 | Hole Violators |
| 6 | WB R3 | M10 | 1 Degeneration X vs 4 Cuzzo's Clinic | 0–2 | Cuzzo's Clinic |
| 7 | WB R3 | M9 | 7 3 Amigos vs 3 Hole Violators | 2–0 | 3 Amigos |
| 8 | WB SF | M14 | 4 Cuzzo's Clinic vs 7 3 Amigos | 2–1 | Cuzzo's Clinic |

### Losers Bracket
| # | Round | Match | Teams | Score | Winner |
|---|---|---|---|---|---|
| 9  | LB R1 | M6  | 6 Hole Burners vs 8 Pepperoni Cheesers | 1–2 | Pepperoni Cheesers |
| 10 | LB R2 | M8  | 2 Seize the Maize vs 8 Pepperoni Cheesers | 2–0 | Seize the Maize |
| 11 | LB R2 | M7  | 5 Cornelius Bag vs 9 Bumbleweed | 0–2 | Bumbleweed |
| 12 | LB R3 | M12 | 1 Degeneration X vs 2 Seize the Maize | 2–0 | Degeneration X |
| 13 | LB R3 | M11 | 3 Hole Violators vs 9 Bumbleweed | 2–0 | Hole Violators |
| 14 | LB R4 | M13 | 1 Degeneration X vs 3 Hole Violators | 2–0 | Degeneration X |
| 15 | LB R5 | M15 | 7 3 Amigos vs 1 Degeneration X | 2–0 | 3 Amigos |

### Grand Final
| # | Round | Teams | Score | Winner |
|---|---|---|---|---|
| 16 | GF | 4 Cuzzo's Clinic vs 7 3 Amigos | 2–0 | Cuzzo's Clinic |

### Implied team records (bracket only, matches the standings already saved)
- Cuzzo's 4–0, 3 Amigos 3–2, Degeneration X 3–2, Hole Violators 2–2, Seize the Maize 1–2, Bumbleweed 1–2 (wait — Bumbleweed actually goes 2–2: won play-in + LB R2, lost WB R2 + LB R3), Pepperoni Cheesers 1–2, Cornelius Bag 0–1, Hole Burners 0–2.

⚠️ **Discrepancy to confirm:** The standings I previously inserted list Bumbleweed as **1–2**, but the bracket above shows Bumbleweed at **2–2** (won play-in over Pepperoni, won LB R2 over Cornelius, lost WB R2 to Degen X, lost LB R3 to Hole Violators). Similarly Pepperoni shows as **1–2** (lost play-in, won LB R1, lost LB R2). Want me to also correct `playoff_team_records` W/L to match the bracket?

### Approve to proceed
Reply "looks good" (or note corrections) and I'll insert the 16 `playoff_matches` rows and, if you confirm, fix the W/L counts in `playoff_team_records`.
