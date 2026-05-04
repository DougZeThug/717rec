REVOKE SELECT ON TABLE
  public.admin_privilege_changes,
  public.security_audit_log,
  public.debug_match_updates,
  public.blind_draw_signups,
  public.team_season_opt_out,
  public.team_memberships,
  public.score_submissions
FROM anon, PUBLIC;