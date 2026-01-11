import React from 'react';

import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import QuickScoreFooter from './components/QuickScoreFooter';
// Import components
import QuickScoreHeader from './components/QuickScoreHeader';
import ScoreOptionButton from './components/ScoreOptionButton';
import TeamDisplay from './components/TeamDisplay';
import { useQuickScoreState } from './hooks/useQuickScoreState';
import { useScoreSubmission } from './hooks/useScoreSubmission';
import { useTeamData } from './hooks/useTeamData';
import { QuickScoreEditorProps } from './types';
import { generateScoreOptions } from './utils/scoreOptionUtils';

const QuickScoreEditor: React.FC<QuickScoreEditorProps> = ({ match, teams, onSave, onCancel }) => {
  const { isSubmitting, setIsSubmitting, selectedOption, setSelectedOption } = useQuickScoreState();
  const { team1, team2, team1Name, team2Name } = useTeamData(match, teams);

  // Generate score options
  const scoreOptions = generateScoreOptions(match.team1Id, match.team2Id);

  // Setup score submission handler
  const { handleQuickScore } = useScoreSubmission({
    match,
    onSave,
    setIsSubmitting,
    setSelectedOption,
  });

  return (
    <div className={animations.fadeIn}>
      <QuickScoreHeader team1Name={team1Name} team2Name={team2Name} />

      <div className="py-6 flex flex-col space-y-4">
        <div
          className={cn('grid grid-cols-2 gap-4', animations.fadeIn)}
          style={{ animationDelay: '0.15s' }}
        >
          <div className="text-center font-medium">{team1Name}</div>
          <div className="text-center font-medium">{team2Name}</div>
        </div>

        <div
          className={cn('grid grid-cols-2 gap-3', animations.fadeIn)}
          style={{ animationDelay: '0.2s' }}
        >
          {/* Team logo/images */}
          <TeamDisplay team={team1} fallbackLabel="T1" />
          <TeamDisplay team={team2} fallbackLabel="T2" />
        </div>

        <div
          className={cn('mt-6 space-y-2', animations.fadeIn)}
          style={{ animationDelay: '0.25s' }}
        >
          <div className="text-sm font-medium">Quick Score Options:</div>
          <div className="grid grid-cols-2 gap-2">
            {/* Team 1 wins options */}
            {scoreOptions.slice(0, 2).map((option, index) => (
              <ScoreOptionButton
                key={option.label}
                option={option}
                selectedOption={selectedOption}
                isForTeam1={true}
                isSubmitting={isSubmitting}
                onSelect={handleQuickScore}
                animationDelay={`${0.3 + index * 0.05}s`}
              />
            ))}

            {/* Team 2 wins options */}
            {scoreOptions.slice(2, 4).map((option, index) => (
              <ScoreOptionButton
                key={option.label}
                option={option}
                selectedOption={selectedOption}
                isForTeam1={false}
                isSubmitting={isSubmitting}
                onSelect={handleQuickScore}
                animationDelay={`${0.4 + index * 0.05}s`}
              />
            ))}
          </div>
        </div>
      </div>

      <QuickScoreFooter onCancel={onCancel} isSubmitting={isSubmitting} />
    </div>
  );
};

export default QuickScoreEditor;
