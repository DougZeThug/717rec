
-- Insert 39 playoff matches for Intermediate 1, Intermediate 2, and Recreational divisions
INSERT INTO playoff_matches 
  (bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, winner_id, loser_id, status, best_of)
VALUES
  -- INTERMEDIATE 1 (bracket_id: 63fd1e7b-a27f-46d2-a7e4-4b2f876e518c)
  -- Winners Bracket
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 1, 1, 'winners', '410f4fd2-a730-48e1-a773-30db1478d208', '2ab2e684-8c28-45c3-801a-ea215433a8e4', 0, 2, '2ab2e684-8c28-45c3-801a-ea215433a8e4', '410f4fd2-a730-48e1-a773-30db1478d208', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 1, 2, 'winners', '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', '3563ec8d-04bb-4517-b4de-305494f7bbf8', 2, 0, '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', '3563ec8d-04bb-4517-b4de-305494f7bbf8', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 1, 3, 'winners', '56387477-8ba1-43b7-a307-414926ca5f79', '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', 0, 2, '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', '56387477-8ba1-43b7-a307-414926ca5f79', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 1, 4, 'winners', '0c7261b9-db22-48d1-8487-ba9eeb90fbef', 'a484a124-89f8-468d-9ebb-2709ad47c7f5', 2, 1, '0c7261b9-db22-48d1-8487-ba9eeb90fbef', 'a484a124-89f8-468d-9ebb-2709ad47c7f5', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 2, 1, 'winners', '2ab2e684-8c28-45c3-801a-ea215433a8e4', '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', 0, 2, '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', '2ab2e684-8c28-45c3-801a-ea215433a8e4', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 2, 2, 'winners', '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', '0c7261b9-db22-48d1-8487-ba9eeb90fbef', 0, 2, '0c7261b9-db22-48d1-8487-ba9eeb90fbef', '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 3, 1, 'winners', '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', '0c7261b9-db22-48d1-8487-ba9eeb90fbef', 1, 2, '0c7261b9-db22-48d1-8487-ba9eeb90fbef', '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', 'completed', 3),
  -- Losers Bracket
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 1, 1, 'losers', '410f4fd2-a730-48e1-a773-30db1478d208', '3563ec8d-04bb-4517-b4de-305494f7bbf8', 0, 2, '3563ec8d-04bb-4517-b4de-305494f7bbf8', '410f4fd2-a730-48e1-a773-30db1478d208', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 1, 2, 'losers', '56387477-8ba1-43b7-a307-414926ca5f79', 'a484a124-89f8-468d-9ebb-2709ad47c7f5', 0, 2, 'a484a124-89f8-468d-9ebb-2709ad47c7f5', '56387477-8ba1-43b7-a307-414926ca5f79', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 2, 1, 'losers', '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', '3563ec8d-04bb-4517-b4de-305494f7bbf8', 2, 0, '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', '3563ec8d-04bb-4517-b4de-305494f7bbf8', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 2, 2, 'losers', '2ab2e684-8c28-45c3-801a-ea215433a8e4', 'a484a124-89f8-468d-9ebb-2709ad47c7f5', 2, 1, '2ab2e684-8c28-45c3-801a-ea215433a8e4', 'a484a124-89f8-468d-9ebb-2709ad47c7f5', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 3, 1, 'losers', '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', '2ab2e684-8c28-45c3-801a-ea215433a8e4', 2, 0, '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', '2ab2e684-8c28-45c3-801a-ea215433a8e4', 'completed', 3),
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 4, 1, 'losers', '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', 2, 1, '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', '4ce38a7a-df7b-4d71-a17c-b8be65e342fe', 'completed', 3),
  -- Finals
  ('63fd1e7b-a27f-46d2-a7e4-4b2f876e518c', 1, 1, 'finals', '0c7261b9-db22-48d1-8487-ba9eeb90fbef', '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', 2, 0, '0c7261b9-db22-48d1-8487-ba9eeb90fbef', '37bf909c-3bcf-45fc-860e-9f64b7b03cbe', 'completed', 3),
  
  -- INTERMEDIATE 2 (bracket_id: ba447faf-bad6-43d3-a798-c62b984e2770)
  -- Winners Bracket
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 1, 1, 'winners', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', 2, 0, '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 1, 2, 'winners', 'aa967a4d-b9a8-496e-81e9-7993ac005763', '00def929-de16-4f59-933f-ae0247b04358', 2, 0, 'aa967a4d-b9a8-496e-81e9-7993ac005763', '00def929-de16-4f59-933f-ae0247b04358', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 1, 3, 'winners', 'c08fd547-4938-48dc-9b9d-dca99f7a1f09', 'aaa86740-56e6-4482-b589-2a292f69692e', 0, 2, 'aaa86740-56e6-4482-b589-2a292f69692e', 'c08fd547-4938-48dc-9b9d-dca99f7a1f09', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 1, 4, 'winners', 'abd71084-cf3f-431e-a57a-428cbe96b459', 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', 1, 2, 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', 'abd71084-cf3f-431e-a57a-428cbe96b459', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 2, 1, 'winners', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'aa967a4d-b9a8-496e-81e9-7993ac005763', 2, 1, '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'aa967a4d-b9a8-496e-81e9-7993ac005763', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 2, 2, 'winners', 'aaa86740-56e6-4482-b589-2a292f69692e', 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', 0, 2, 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', 'aaa86740-56e6-4482-b589-2a292f69692e', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 3, 1, 'winners', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', 2, 0, '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', 'completed', 3),
  -- Losers Bracket
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 1, 1, 'losers', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', '00def929-de16-4f59-933f-ae0247b04358', 1, 2, '00def929-de16-4f59-933f-ae0247b04358', '31e0e752-e0fc-4bd1-892f-3b7123ad72b7', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 1, 2, 'losers', 'c08fd547-4938-48dc-9b9d-dca99f7a1f09', 'abd71084-cf3f-431e-a57a-428cbe96b459', 0, 2, 'abd71084-cf3f-431e-a57a-428cbe96b459', 'c08fd547-4938-48dc-9b9d-dca99f7a1f09', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 2, 1, 'losers', 'aaa86740-56e6-4482-b589-2a292f69692e', '00def929-de16-4f59-933f-ae0247b04358', 2, 0, 'aaa86740-56e6-4482-b589-2a292f69692e', '00def929-de16-4f59-933f-ae0247b04358', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 2, 2, 'losers', 'aa967a4d-b9a8-496e-81e9-7993ac005763', 'abd71084-cf3f-431e-a57a-428cbe96b459', 0, 2, 'abd71084-cf3f-431e-a57a-428cbe96b459', 'aa967a4d-b9a8-496e-81e9-7993ac005763', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 3, 1, 'losers', 'aaa86740-56e6-4482-b589-2a292f69692e', 'abd71084-cf3f-431e-a57a-428cbe96b459', 2, 0, 'aaa86740-56e6-4482-b589-2a292f69692e', 'abd71084-cf3f-431e-a57a-428cbe96b459', 'completed', 3),
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 4, 1, 'losers', 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', 'aaa86740-56e6-4482-b589-2a292f69692e', 0, 2, 'aaa86740-56e6-4482-b589-2a292f69692e', 'f7e65c9a-4a56-4e7a-bcff-60e64c71b893', 'completed', 3),
  -- Finals
  ('ba447faf-bad6-43d3-a798-c62b984e2770', 1, 1, 'finals', '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'aaa86740-56e6-4482-b589-2a292f69692e', 2, 0, '01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'aaa86740-56e6-4482-b589-2a292f69692e', 'completed', 3),
  
  -- RECREATIONAL (bracket_id: e3e11f22-c2d7-442d-aa0f-ff55e4df40a7)
  -- Winners Bracket
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 1, 1, 'winners', 'f6dbab64-cc61-4efe-ac3f-e756345d94ed', 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', 1, 2, 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', 'f6dbab64-cc61-4efe-ac3f-e756345d94ed', 'completed', 3),
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 1, 2, 'winners', 'de3cb5fe-7c5f-4211-8876-a52140df49b7', '34b73bf9-d170-4fee-ab68-e506db5cbe05', 2, 0, 'de3cb5fe-7c5f-4211-8876-a52140df49b7', '34b73bf9-d170-4fee-ab68-e506db5cbe05', 'completed', 3),
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 2, 1, 'winners', 'c577e0f9-6700-4220-a902-b368ca915bbd', 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', 2, 0, 'c577e0f9-6700-4220-a902-b368ca915bbd', 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', 'completed', 3),
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 2, 2, 'winners', '34b1dacf-0c30-4a4c-8228-432701868f34', 'de3cb5fe-7c5f-4211-8876-a52140df49b7', 2, 1, '34b1dacf-0c30-4a4c-8228-432701868f34', 'de3cb5fe-7c5f-4211-8876-a52140df49b7', 'completed', 3),
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 3, 1, 'winners', 'c577e0f9-6700-4220-a902-b368ca915bbd', '34b1dacf-0c30-4a4c-8228-432701868f34', 2, 1, 'c577e0f9-6700-4220-a902-b368ca915bbd', '34b1dacf-0c30-4a4c-8228-432701868f34', 'completed', 3),
  -- Losers Bracket
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 1, 1, 'losers', 'de3cb5fe-7c5f-4211-8876-a52140df49b7', 'f6dbab64-cc61-4efe-ac3f-e756345d94ed', 2, 0, 'de3cb5fe-7c5f-4211-8876-a52140df49b7', 'f6dbab64-cc61-4efe-ac3f-e756345d94ed', 'completed', 3),
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 1, 2, 'losers', 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', '34b73bf9-d170-4fee-ab68-e506db5cbe05', 2, 1, 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', '34b73bf9-d170-4fee-ab68-e506db5cbe05', 'completed', 3),
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 2, 1, 'losers', 'de3cb5fe-7c5f-4211-8876-a52140df49b7', 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', 2, 0, 'de3cb5fe-7c5f-4211-8876-a52140df49b7', 'ea3b15e7-8bc7-467c-85fc-7f91e89742a1', 'completed', 3),
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 3, 1, 'losers', '34b1dacf-0c30-4a4c-8228-432701868f34', 'de3cb5fe-7c5f-4211-8876-a52140df49b7', 2, 0, '34b1dacf-0c30-4a4c-8228-432701868f34', 'de3cb5fe-7c5f-4211-8876-a52140df49b7', 'completed', 3),
  -- Finals (Grand Finals bracket reset)
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 1, 1, 'finals', 'c577e0f9-6700-4220-a902-b368ca915bbd', '34b1dacf-0c30-4a4c-8228-432701868f34', 1, 2, '34b1dacf-0c30-4a4c-8228-432701868f34', 'c577e0f9-6700-4220-a902-b368ca915bbd', 'completed', 3),
  ('e3e11f22-c2d7-442d-aa0f-ff55e4df40a7', 2, 1, 'finals', '34b1dacf-0c30-4a4c-8228-432701868f34', 'c577e0f9-6700-4220-a902-b368ca915bbd', 2, 0, '34b1dacf-0c30-4a4c-8228-432701868f34', 'c577e0f9-6700-4220-a902-b368ca915bbd', 'completed', 3);
