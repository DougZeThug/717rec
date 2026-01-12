-- Verification Script: Test match → playoff_matches sync
-- This script verifies the trigger works correctly.
-- Run this AFTER the main migration (20260112200000_sync_match_to_playoff_matches.sql)
--
-- TEST CASES:
-- 1. Insert a qualifying bracket match → verify playoff_matches row created
-- 2. Insert same match again (retry scenario) → verify no duplicate created
-- 3. Verify field mappings are correct

-- Step 1: Create test data setup (only if test bracket doesn't exist)
DO $$
DECLARE
  v_test_bracket_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_test_stage_id INTEGER;
  v_test_group_id INTEGER;
  v_test_round_id INTEGER;
  v_test_match_id INTEGER;
  v_playoff_match_count INTEGER;
BEGIN
  -- Check if test bracket already exists
  IF NOT EXISTS (SELECT 1 FROM brackets WHERE id = v_test_bracket_id) THEN
    -- Create test bracket
    INSERT INTO brackets (id, title, state, created_at)
    VALUES (v_test_bracket_id, 'Test Bracket for Sync Verification', 'active', NOW());
  END IF;

  -- Check if test stage already exists
  SELECT id INTO v_test_stage_id FROM stage WHERE tournament_id = v_test_bracket_id LIMIT 1;

  IF v_test_stage_id IS NULL THEN
    -- Create test stage
    INSERT INTO stage (tournament_id, name, type, number)
    VALUES (v_test_bracket_id, 'Test Stage', 'double_elimination', 1)
    RETURNING id INTO v_test_stage_id;
  END IF;

  -- Check if test group already exists
  SELECT id INTO v_test_group_id FROM "group" WHERE stage_id = v_test_stage_id AND number = 1 LIMIT 1;

  IF v_test_group_id IS NULL THEN
    -- Create test group (winners bracket = group 1)
    INSERT INTO "group" (stage_id, number, name)
    VALUES (v_test_stage_id, 1, 'Winners Bracket')
    RETURNING id INTO v_test_group_id;
  END IF;

  -- Check if test round already exists
  SELECT id INTO v_test_round_id FROM round WHERE group_id = v_test_group_id AND number = 1 LIMIT 1;

  IF v_test_round_id IS NULL THEN
    -- Create test round
    INSERT INTO round (group_id, number, name)
    VALUES (v_test_group_id, 1, 'Round 1')
    RETURNING id INTO v_test_round_id;
  END IF;

  -- Count playoff_matches before test
  SELECT COUNT(*) INTO v_playoff_match_count
  FROM playoff_matches
  WHERE bracket_id = v_test_bracket_id;

  RAISE NOTICE 'TEST SETUP: Bracket %, Stage %, Group %, Round %',
    v_test_bracket_id, v_test_stage_id, v_test_group_id, v_test_round_id;
  RAISE NOTICE 'Playoff matches before test: %', v_playoff_match_count;

  -- TEST 1: Insert a new match
  INSERT INTO match (stage_id, group_id, round_id, number, status)
  VALUES (v_test_stage_id, v_test_group_id, v_test_round_id, 99, 1)
  RETURNING id INTO v_test_match_id;

  RAISE NOTICE 'TEST 1: Inserted match with ID %', v_test_match_id;

  -- Verify playoff_matches row was created
  IF EXISTS (
    SELECT 1 FROM playoff_matches
    WHERE match_id = v_test_match_id
    AND bracket_id = v_test_bracket_id
  ) THEN
    RAISE NOTICE 'TEST 1 PASSED: playoff_matches row created for match_id %', v_test_match_id;
  ELSE
    RAISE EXCEPTION 'TEST 1 FAILED: No playoff_matches row found for match_id %', v_test_match_id;
  END IF;

  -- TEST 2: Try to insert a duplicate (simulating retry)
  -- The ON CONFLICT DO NOTHING should prevent duplicates
  BEGIN
    -- This should do nothing due to unique constraint
    INSERT INTO playoff_matches (
      id, bracket_id, round, position, match_type, match_id, created_at
    ) VALUES (
      gen_random_uuid(), v_test_bracket_id, 1, 99, 'winners', v_test_match_id, NOW()
    )
    ON CONFLICT (match_id) DO NOTHING;

    RAISE NOTICE 'TEST 2 PASSED: Duplicate insert handled gracefully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 2 PASSED: Duplicate prevented by constraint';
  END;

  -- Verify only one playoff_match exists for this match_id
  SELECT COUNT(*) INTO v_playoff_match_count
  FROM playoff_matches
  WHERE match_id = v_test_match_id;

  IF v_playoff_match_count = 1 THEN
    RAISE NOTICE 'TEST 2 VERIFIED: Exactly 1 playoff_match exists for match_id % (idempotent)', v_test_match_id;
  ELSE
    RAISE EXCEPTION 'TEST 2 FAILED: Expected 1 playoff_match, found %', v_playoff_match_count;
  END IF;

  -- TEST 3: Verify field mappings
  PERFORM 1 FROM playoff_matches pm
  WHERE pm.match_id = v_test_match_id
    AND pm.bracket_id = v_test_bracket_id
    AND pm.round = 1
    AND pm.position = 99
    AND pm.match_type = 'winners';

  IF FOUND THEN
    RAISE NOTICE 'TEST 3 PASSED: Field mappings are correct';
  ELSE
    RAISE EXCEPTION 'TEST 3 FAILED: Field mappings incorrect';
  END IF;

  -- Cleanup: Delete test data
  DELETE FROM playoff_matches WHERE match_id = v_test_match_id;
  DELETE FROM match WHERE id = v_test_match_id;
  DELETE FROM round WHERE id = v_test_round_id;
  DELETE FROM "group" WHERE id = v_test_group_id;
  DELETE FROM stage WHERE id = v_test_stage_id;
  DELETE FROM brackets WHERE id = v_test_bracket_id;

  RAISE NOTICE 'CLEANUP: Test data removed';
  RAISE NOTICE '=== ALL TESTS PASSED ===';

EXCEPTION WHEN OTHERS THEN
  -- Cleanup on failure
  DELETE FROM playoff_matches WHERE bracket_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  DELETE FROM match WHERE stage_id IN (SELECT id FROM stage WHERE tournament_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  DELETE FROM round WHERE group_id IN (SELECT id FROM "group" WHERE stage_id IN (SELECT id FROM stage WHERE tournament_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'));
  DELETE FROM "group" WHERE stage_id IN (SELECT id FROM stage WHERE tournament_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  DELETE FROM stage WHERE tournament_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  DELETE FROM brackets WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  RAISE;
END $$;
