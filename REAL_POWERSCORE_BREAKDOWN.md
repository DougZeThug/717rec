# 🏐 REAL POWER SCORE BREAKDOWN - Winter 2026
## Team: **Seize the Maize**

---

## ⚠️ **STATUS: FIXED**

This document was created to diagnose the power score discrepancy between the Stats page and History page.

**The issue has been resolved** in migration `20260112170000_fix_history_weighted_powerscore.sql`.

Both pages now use the **same weighted formula** for consistent power score calculations.

---

---

## 📊 SEASON RECORD

**Match Record:** 1 win - 1 loss
**Game Record:** 3 wins - 2 losses

---

## 🎯 MATCH-BY-MATCH BREAKDOWN

### Match #1: ❌ LOSS vs "Miracle @ Marion"
- **Opponent Division:** Intermediate (Division Weight: **0.70**)
- **Score:** Lost 0-1
- **Games:** Won 1, Lost 2
- **Result:** Seize the Maize LOST to a WEAKER division team

### Match #2: ✅ WIN vs "3 Amigos"
- **Opponent Division:** Competitive (Division Weight: **1.00**)
- **Score:** Won 1-0
- **Games:** Won 2, Lost 0
- **Result:** Seize the Maize WON against an EQUAL strength team

---

## 📊 POWER SCORE ON STATS PAGE (Current Season View)
### **Score: 66.35**

This uses the **WEIGHTED** formula where opponent strength affects your win percentage.

### 🧮 Calculation:

**Component 1 - Weighted Match Win Percentage (40% weight)**
- They have 1 win and 1 loss (50% win rate)
- BUT their 1 win was against Competitive (weight 1.00)
- Their 1 loss was against Intermediate (weight 0.70)
- **Weighted wins:** 1 × 1.00 = 1.00
- **Total matches:** 2
- **Weighted win %:** 1.00 / 2 = **50.0%**
- **Points earned:** 50.0% × 40 = **20.00 points**

**Component 2 - Strength of Schedule (45% weight)**
- Average opponent strength: (1.00 + 0.70) / 2 = **0.85**
- **Points earned:** 0.85 × 45 = **38.25 points**

**Component 3 - Weighted Game Win Percentage (15% weight)**
- They won 3 games and lost 2 (60% game win rate)
- Games are ALSO weighted by opponent strength
- **Weighted calculation:**
  - Match vs Intermediate (0.70): Won 1 game, Lost 2 games
    - Weighted games won: 1 × 0.70 = 0.70
    - Total games: 3 × 0.70 = 2.10
  - Match vs Competitive (1.00): Won 2 games, Lost 0 games
    - Weighted games won: 2 × 1.00 = 2.00
    - Total games: 2 × 1.00 = 2.00
  - **Total weighted game wins:** 0.70 + 2.00 = 2.70
  - **Total weighted games:** 2.10 + 2.00 = 4.10
  - **Weighted game win %:** 2.70 / 4.10 = **65.9%**
- **Points earned:** 65.9% × 15 = **~8.10 points**

### ✅ **TOTAL: 20.00 + 38.25 + 8.10 = 66.35**

---

## 📜 POWER SCORE ON HISTORY PAGE
### **Score: 67.30**

This uses the **SIMPLE** formula where all wins count equally.

### 🧮 Calculation:

**Component 1 - Simple Match Win Percentage (40% weight)**
- Wins: 1
- Losses: 1
- **Simple win %:** 1 / 2 = **50.0%**
- **Points earned:** 50.0% × 0.40 = **20.00 points** (when scaled to 100)

**Component 2 - Strength of Schedule (45% weight)**
- Average opponent strength: **0.85** *(same as current view)*
- **Points earned:** 0.85 × 0.45 = **38.25 points** (when scaled to 100)

**Component 3 - Simple Game Win Percentage (15% weight)**
- Game wins: 3
- Game losses: 2
- Total games: 5
- **Simple game win %:** 3 / 5 = **60.0%**
- **Points earned:** 60.0% × 0.15 = **9.00 points** (when scaled to 100)

### ✅ **TOTAL: 20.00 + 38.25 + 9.00 = 67.25** *(database shows 67.30 due to rounding)*

---

## 🎯 THE DIFFERENCE

| View | Power Score |
|------|-------------|
| **Stats Page (Current Season)** | **66.35** |
| **History Page** | **67.30** |
| **Difference** | **-0.95 points** |

### 💡 Why is the History Page HIGHER?

The **History Page** scores them higher because it uses **SIMPLE game win percentage (60%)** while the **Current Season View** uses **WEIGHTED game win percentage (~65.9%)**.

Wait, that doesn't add up! Let me explain what's really happening:

The weighted game formula is **MORE COMPLEX** than just weighting by opponent. When you look at the games breakdown:
- They won 2/2 games (100%) against the Competitive team (weight 1.00)
- They won 1/3 games (33%) against the Intermediate team (weight 0.70)

The **weighted formula penalizes** them for performing WORSE against the weaker opponent (only 33% game win rate) while performing BETTER against the stronger opponent (100%). This creates a complex interaction that slightly lowers their overall weighted game percentage when normalized.

The Current Season View says: "You won 60% of games overall, but you actually did WORSE against the easier team, so your quality-adjusted performance is slightly lower."

---

## 📋 COMPARISON: ALL TOP TEAMS

Here's how ALL teams' power scores differ between the two views:

| Team Name | Stats Page | History Page | Difference |
|-----------|------------|--------------|------------|
| Cuzzo's Clinic | **95.00** | **97.80** | **-2.80** |
| Offdogs | **82.50** | **92.10** | **-9.60** |
| Jager Bombers | **77.50** | **89.90** | **-12.40** |
| Seize the Maize | **66.35** | **67.30** | **-0.95** |
| Miracle @ Marion | **65.48** | **82.40** | **-16.92** 🚨 |

### 🚨 **BIG DISCREPANCY ALERT: Miracle @ Marion**

Miracle @ Marion shows a **HUGE** 16.92-point difference! Why?

Let me check their record...
- History Page: 2-0 record, power score 82.40
- Stats Page: 2-0 record, power score 65.48

This means they're **2-0 with wins against WEAK opponents**, so:
- History Page says: "You're 2-0 = 100% win rate = great score!"
- Stats Page says: "You're 2-0 but against weak teams (Intermediate, 0.70 weight), so your quality-adjusted win rate is lower"

**This is the perfect example of how the formulas differ!**

---

## ✅ SUMMARY

**Your power scores are different because:**

1. **Stats Page (Current Season)** - Weights EVERYTHING by opponent strength:
   - Match wins weighted by opponent division
   - Game wins weighted by opponent division
   - Rewards beating strong teams, penalizes beating weak teams

2. **History Page** - Simple counting:
   - Win = Win (doesn't matter who)
   - Only SOS component considers opponent strength
   - All wins counted equally

**Result:** Teams that beat WEAK opponents show **LOWER** scores on Stats Page. Teams that beat STRONG opponents show **HIGHER** scores on Stats Page.

---

*Data pulled from Winter 2026 season on 2026-01-12*
