-- A. Internal-only: revoke EXECUTE from anon, authenticated, and PUBLIC
REVOKE EXECUTE ON FUNCTION
  public.trg_set_timestamp(),
  public.handle_new_user(),
  public.handle_message_update(),
  public.prevent_admin_privilege_escalation(),
  public.prevent_admin_privilege_escalation_on_insert(),
  public.log_admin_privilege_change(),
  public.log_security_operation(text, text, uuid, jsonb, jsonb),
  public.validate_membership_approval(),
  public.sync_match_delete_to_playoff_matches(),
  public.sync_match_insert_to_playoff_matches(),
  public.sync_match_update_to_playoff_matches(),
  public.trigger_cleanup_team_season_stats_on_match_delete(),
  public.trigger_cleanup_team_season_stats_on_playoff_delete(),
  public.fn_update_playoff_record(),
  public.cleanup_orphaned_team_season_stat(uuid, uuid),
  public.insert_participant(uuid, uuid, integer)
FROM anon, authenticated, PUBLIC;

-- B. Admin-only: revoke EXECUTE from anon and PUBLIC, keep authenticated
REVOKE EXECUTE ON FUNCTION
  public.activate_season(uuid),
  public.activate_season_with_partial_archive(uuid),
  public.archive_season(uuid, uuid, uuid, uuid),
  public.partial_archive_season(uuid),
  public.finalize_playoffs(uuid, uuid, uuid, uuid),
  public.approve_match_result(uuid, uuid, uuid, integer, integer),
  public.mark_match_as_tie(uuid),
  public.update_team_stats(uuid, uuid, integer, integer),
  public.reverse_team_stats(uuid, uuid, integer, integer),
  public.upsert_team_season_stats(),
  public.auto_assign_seeds(uuid),
  public.batch_update_team_seeds(jsonb),
  public.reset_division_seeds(uuid),
  public.validate_division_seeds(uuid),
  public.award_broom_crew_badge(uuid),
  public.award_bully_badge(uuid),
  public.award_chaos_agent_badge(uuid),
  public.award_clutch_performer_badge(uuid),
  public.award_consistent_performer_badge(uuid),
  public.award_gatekeeper_badge(uuid),
  public.award_ice_cold_badge(uuid),
  public.award_kingslayer_badge(uuid, uuid),
  public.award_streak_badges(uuid),
  public.process_match_badges(uuid, uuid),
  public.calculate_career_power_score(uuid),
  public.calculate_team_streak(uuid)
FROM anon, PUBLIC;