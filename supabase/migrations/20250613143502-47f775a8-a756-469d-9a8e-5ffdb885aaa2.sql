
-- Update v_team_details view to fix the weighted win percentage formulas
-- The issue: current formulas divide by sum of opponent weights instead of total matches/games
-- Fix: divide weighted wins by total matches, weighted game wins by total games

DROP VIEW IF EXISTS public.v_team_details CASCADE;

CREATE VIEW public.v_team_details AS
SELECT 
    t.id AS team_id,
    t.name,
    t.logo_url,
    t.image_url,
    t.players,
    t.created_at,
    t.division_id,
    -- Use display_division for consistent 3-tier grouping
    COALESCE(d.display_division, 'Recreational') AS divisionname,
    COALESCE(stats.win_percentage, 0) AS win_percentage,
    COALESCE(stats.game_win_percentage, 0) AS game_win_percentage,
    COALESCE(stats.wins, t.wins::bigint) AS wins,
    COALESCE(stats.losses, t.losses::bigint) AS losses,
    COALESCE(stats.game_wins, t.game_wins::bigint) AS game_wins,
    COALESCE(stats.game_losses, t.game_losses::bigint) AS game_losses,
    COALESCE(stats.close_match_losses, 0) AS close_match_losses,
    COALESCE(weighted_stats.weighted_win_percentage, 0) AS weighted_win_percentage,
    COALESCE(weighted_stats.weighted_game_win_percentage, 0) AS weighted_game_win_percentage,
    COALESCE(sos_calc.sos, 0.5) AS sos,
    -- CORRECTED 40/40/20 POWER SCORE FORMULA with fixed weighted percentages
    COALESCE(power_calc.power_score, 50.0) AS power_score
FROM teams t
LEFT JOIN divisions d ON t.division_id = d.id
LEFT JOIN v_team_match_stats stats ON t.id = stats.team_id
LEFT JOIN (
    -- CORRECTED weighted win percentage calculation
    SELECT 
        t.id as team_id,
        CASE 
            WHEN COUNT(m.*) = 0 THEN 0
            ELSE (
                SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END) / 
                NULLIF(COUNT(m.*), 0)  -- FIXED: divide by total matches, not sum of weights
            )
        END as weighted_win_percentage,
        CASE 
            WHEN SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)
                         WHEN m.team2_id = t.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)
                         ELSE 0 END) = 0 THEN 0
            ELSE (
                SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins * d_opp.division_weight
                         WHEN m.team2_id = t.id THEN m.team2_game_wins * d_opp.division_weight
                         ELSE 0 END) / 
                NULLIF(SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)
                               WHEN m.team2_id = t.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)
                               ELSE 0 END), 0)  -- FIXED: divide by total games, not weighted total games
            )
        END as weighted_game_win_percentage
    FROM teams t
    LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
    LEFT JOIN teams t_opp ON (
        CASE 
            WHEN m.team1_id = t.id THEN m.team2_id 
            WHEN m.team2_id = t.id THEN m.team1_id 
        END = t_opp.id
    )
    LEFT JOIN divisions d_opp ON t_opp.division_id = d_opp.id
    GROUP BY t.id
) weighted_stats ON t.id = weighted_stats.team_id
LEFT JOIN (
    -- Strength of Schedule: Average opponent division weight (unchanged)
    SELECT 
        t.id as team_id,
        CASE 
            WHEN COUNT(DISTINCT opp.id) = 0 THEN 0.5
            ELSE GREATEST(0.1, LEAST(1.0, AVG(COALESCE(d_opp.division_weight, 0.85))))
        END as sos
    FROM teams t
    LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
    LEFT JOIN teams opp ON (
        CASE 
            WHEN m.team1_id = t.id THEN m.team2_id 
            WHEN m.team2_id = t.id THEN m.team1_id 
        END = opp.id
    )
    LEFT JOIN divisions d_opp ON opp.division_id = d_opp.id
    GROUP BY t.id
) sos_calc ON t.id = sos_calc.team_id
LEFT JOIN (
    -- CORRECTED 40/40/20 POWER SCORE FORMULA with fixed weighted percentages
    SELECT 
        t.id as team_id,
        CASE 
            WHEN COUNT(m.*) = 0 THEN 50.0  -- Baseline for teams with no matches
            ELSE (
                -- 40% Weighted Match Win Percentage (CORRECTED)
                (COALESCE(weighted_match_stats.weighted_win_percentage, 0) * 40.0) +
                -- 40% Strength of Schedule  
                (COALESCE(sos_component.sos, 0.5) * 40.0) +
                -- 20% Weighted Game Win Percentage (CORRECTED)
                (COALESCE(weighted_game_stats.weighted_game_win_percentage, 0) * 20.0)
            )
        END as power_score
    FROM teams t
    LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
    LEFT JOIN (
        -- CORRECTED weighted match win percentage for power score
        SELECT 
            t.id as team_id,
            CASE 
                WHEN COUNT(m.*) = 0 THEN 0
                ELSE (
                    SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END) / 
                    NULLIF(COUNT(m.*), 0)  -- FIXED: divide by total matches
                )
            END as weighted_win_percentage
        FROM teams t
        LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
        LEFT JOIN teams t_opp ON (
            CASE 
                WHEN m.team1_id = t.id THEN m.team2_id 
                WHEN m.team2_id = t.id THEN m.team1_id 
            END = t_opp.id
        )
        LEFT JOIN divisions d_opp ON t_opp.division_id = d_opp.id
        GROUP BY t.id
    ) weighted_match_stats ON t.id = weighted_match_stats.team_id
    LEFT JOIN (
        -- SOS component for power score (unchanged)
        SELECT 
            t.id as team_id,
            CASE 
                WHEN COUNT(DISTINCT opp.id) = 0 THEN 0.5
                ELSE GREATEST(0.1, LEAST(1.0, AVG(COALESCE(d_opp.division_weight, 0.85))))
            END as sos
        FROM teams t
        LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
        LEFT JOIN teams opp ON (
            CASE 
                WHEN m.team1_id = t.id THEN m.team2_id 
                WHEN m.team2_id = t.id THEN m.team1_id 
            END = opp.id
        )
        LEFT JOIN divisions d_opp ON opp.division_id = d_opp.id
        GROUP BY t.id
    ) sos_component ON t.id = sos_component.team_id
    LEFT JOIN (
        -- CORRECTED weighted game win percentage for power score
        SELECT 
            t.id as team_id,
            CASE 
                WHEN SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)
                             WHEN m.team2_id = t.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)
                             ELSE 0 END) = 0 THEN 0
                ELSE (
                    SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins * d_opp.division_weight
                             WHEN m.team2_id = t.id THEN m.team2_game_wins * d_opp.division_weight
                             ELSE 0 END) / 
                    NULLIF(SUM(CASE WHEN m.team1_id = t.id THEN m.team1_game_wins + COALESCE(m.team2_game_wins, 0)
                                   WHEN m.team2_id = t.id THEN m.team2_game_wins + COALESCE(m.team1_game_wins, 0)
                                   ELSE 0 END), 0)  -- FIXED: divide by total games
                )
            END as weighted_game_win_percentage
        FROM teams t
        LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.iscompleted = true
        LEFT JOIN teams t_opp ON (
            CASE 
                WHEN m.team1_id = t.id THEN m.team2_id 
                WHEN m.team2_id = t.id THEN m.team1_id 
            END = t_opp.id
        )
        LEFT JOIN divisions d_opp ON t_opp.division_id = d_opp.id
        GROUP BY t.id
    ) weighted_game_stats ON t.id = weighted_game_stats.team_id
    GROUP BY t.id, weighted_match_stats.weighted_win_percentage, sos_component.sos, weighted_game_stats.weighted_game_win_percentage
) power_calc ON t.id = power_calc.team_id
ORDER BY t.name;

-- Recreate dependent views that were dropped
CREATE VIEW public.v_team_details_with_season AS
SELECT 
    t.team_id,
    t.name,
    t.logo_url,
    t.image_url,
    t.players,
    t.wins,
    t.losses,
    t.game_wins,
    t.game_losses,
    t.created_at,
    t.division_id,
    t.divisionname,
    t.win_percentage,
    t.game_win_percentage,
    t.close_match_losses,
    t.weighted_win_percentage,
    t.weighted_game_win_percentage,
    t.sos,
    t.power_score,
    s.id as season_id
FROM v_team_details t
CROSS JOIN (SELECT id FROM seasons WHERE is_active = true LIMIT 1) s;

CREATE VIEW public.v_team_power_scores AS
SELECT 
    team_id,
    name as team_name,
    division_id,
    wins,
    losses,
    game_wins,
    game_losses,
    win_percentage,
    game_win_percentage,
    close_match_losses,
    sos,
    power_score
FROM v_team_details;

CREATE VIEW public.v_team_season_agg AS
SELECT 
    t.team_id,
    s.id as season_id,
    COALESCE(SUM(CASE WHEN m.winner_id = t.team_id THEN 1 ELSE 0 END), 0) as match_wins,
    COALESCE(SUM(CASE WHEN m.loser_id = t.team_id THEN 1 ELSE 0 END), 0) as match_losses,
    COALESCE(SUM(CASE 
        WHEN m.team1_id = t.team_id THEN m.team1_game_wins 
        WHEN m.team2_id = t.team_id THEN m.team2_game_wins 
        ELSE 0 
    END), 0) as game_wins,
    COALESCE(SUM(CASE 
        WHEN m.team1_id = t.team_id THEN m.team2_game_wins 
        WHEN m.team2_id = t.team_id THEN m.team1_game_wins 
        ELSE 0 
    END), 0) as game_losses,
    t.sos,
    t.power_score
FROM v_team_details t
CROSS JOIN seasons s
LEFT JOIN matches m ON (m.team1_id = t.team_id OR m.team2_id = t.team_id) 
    AND m.iscompleted = true 
    AND m.season_id = s.id
WHERE s.is_active = true
GROUP BY t.team_id, s.id, t.sos, t.power_score;
