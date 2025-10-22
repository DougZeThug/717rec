
-- Add foreign key constraints for brackets-manager tables
-- These constraints ensure referential integrity across the bracket structure

-- stage references brackets (tournament_id)
ALTER TABLE public.stage
ADD CONSTRAINT fk_stage_tournament
FOREIGN KEY (tournament_id) REFERENCES public.brackets(id) ON DELETE CASCADE;

-- group references stage
ALTER TABLE public."group"
ADD CONSTRAINT fk_group_stage
FOREIGN KEY (stage_id) REFERENCES public.stage(id) ON DELETE CASCADE;

-- round references both group and stage
ALTER TABLE public.round
ADD CONSTRAINT fk_round_group
FOREIGN KEY (group_id) REFERENCES public."group"(id) ON DELETE CASCADE;

ALTER TABLE public.round
ADD CONSTRAINT fk_round_stage
FOREIGN KEY (stage_id) REFERENCES public.stage(id) ON DELETE CASCADE;

-- match references stage, group, and round
ALTER TABLE public.match
ADD CONSTRAINT fk_match_stage
FOREIGN KEY (stage_id) REFERENCES public.stage(id) ON DELETE CASCADE;

ALTER TABLE public.match
ADD CONSTRAINT fk_match_group
FOREIGN KEY (group_id) REFERENCES public."group"(id) ON DELETE CASCADE;

ALTER TABLE public.match
ADD CONSTRAINT fk_match_round
FOREIGN KEY (round_id) REFERENCES public.round(id) ON DELETE CASCADE;

-- match_game references match
ALTER TABLE public.match_game
ADD CONSTRAINT fk_match_game_match
FOREIGN KEY (match_id) REFERENCES public.match(id) ON DELETE CASCADE;

-- participant references brackets (tournament_id)
ALTER TABLE public.participant
ADD CONSTRAINT fk_participant_tournament
FOREIGN KEY (tournament_id) REFERENCES public.brackets(id) ON DELETE CASCADE;

-- Add comments explaining the relationships
COMMENT ON CONSTRAINT fk_stage_tournament ON public.stage IS 'Each stage belongs to a bracket (tournament)';
COMMENT ON CONSTRAINT fk_group_stage ON public."group" IS 'Each group belongs to a stage';
COMMENT ON CONSTRAINT fk_round_group ON public.round IS 'Each round belongs to a group';
COMMENT ON CONSTRAINT fk_round_stage ON public.round IS 'Each round belongs to a stage (denormalized for performance)';
COMMENT ON CONSTRAINT fk_match_stage ON public.match IS 'Each match belongs to a stage';
COMMENT ON CONSTRAINT fk_match_group ON public.match IS 'Each match belongs to a group';
COMMENT ON CONSTRAINT fk_match_round ON public.match IS 'Each match belongs to a round';
COMMENT ON CONSTRAINT fk_match_game_match ON public.match_game IS 'Each game belongs to a match';
COMMENT ON CONSTRAINT fk_participant_tournament ON public.participant IS 'Each participant belongs to a bracket (tournament)';
