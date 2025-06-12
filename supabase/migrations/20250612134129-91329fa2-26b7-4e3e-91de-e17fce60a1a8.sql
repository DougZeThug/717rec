
-- Update v_team_details view to exclude teams that have opted out of the current active season
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
    -- Use display_division instead of division name for consistent 3-tier grouping
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
    COALESCE(power_calc.power_score, 0) AS power_score
FROM teams t
LEFT JOIN divisions d ON t.division_id = d.id
LEFT JOIN v_team_match_stats stats ON t.id = stats.team_id
-- Filter out teams that have opted out of the current active season
LEFT JOIN team_season_opt_out opt_out ON (
    t.id = opt_out.team_id 
    AND opt_out.season_id = (SELECT id FROM seasons WHERE is_active = true LIMIT 1)
)
LEFT JOIN (
    -- Weighted win percentage calculation using division weights
    SELECT 
        t.id as team_id,
        CASE 
            WHEN COUNT(m.*) = 0 THEN 0
            ELSE (
                SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END) / 
                NULLIF(SUM(d_opp.division_weight), 0)
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
                NULLIF(SUM(CASE WHEN m.team1_id = t.id THEN (m.team1_game_wins + COALESCE(m.team2_game_wins, 0)) * d_opp.division_weight
                               WHEN m.team2_id = t.id THEN (m.team2_game_wins + COALESCE(m.team1_game_wins, 0)) * d_opp.division_weight
                               ELSE 0 END), 0)
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
    -- DIVISION-BASED SOS: Average of opponent division weights
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
    -- Power score calculation: 25% regular win%, 25% game win%, 50% SOS-weighted
    SELECT 
        t.id as team_id,
        GREATEST(0, LEAST(100, (
            (COALESCE(base_stats.win_percentage, 0) * 25) +
            (COALESCE(base_stats.game_win_percentage, 0) * 25) +
            (COALESCE(weighted_perf.weighted_win_percentage, 0) * 30) +
            (COALESCE(sos_component.sos, 0.5) * 20)
        ))) as power_score
    FROM teams t
    LEFT JOIN v_team_match_stats base_stats ON t.id = base_stats.team_id
    LEFT JOIN (
        -- Weighted performance calculation
        SELECT 
            t.id as team_id,
            CASE 
                WHEN COUNT(m.*) = 0 THEN 0
                ELSE (
                    SUM(CASE WHEN m.winner_id = t.id THEN d_opp.division_weight ELSE 0 END) / 
                    NULLIF(SUM(d_opp.division_weight), 0)
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
    ) weighted_perf ON t.id = weighted_perf.team_id
    LEFT JOIN (
        -- Division-based SOS component for power score
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
    GROUP BY t.id, base_stats.win_percentage, base_stats.game_win_percentage, weighted_perf.weighted_win_percentage, sos_component.sos
) power_calc ON t.id = power_calc.team_id
-- Exclude teams that have opted out of the current active season
WHERE opt_out.team_id IS NULL
ORDER BY t.name;

-- Recreate dependent views
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
