import { Award, Star, Trophy } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SeasonalIcon } from '@/components/ui/seasonal-icon';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Team } from '@/types';

import { championAnimation } from '../animation/BracketAnimationUtils';
import Confetti from './Confetti';

interface ChampionDisplayProps {
  champion: Team | null;
  onClose?: () => void;
  showConfetti?: boolean;
}

const ChampionDisplay: React.FC<ChampionDisplayProps> = ({
  champion,
  onClose,
  showConfetti = true,
}) => {
  const [showAnimation, setShowAnimation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (champion) {
      setShowAnimation(true);

      // Announce champion in toast
      toast({
        title: 'Tournament Complete!',
        description: `${champion.name} is the tournament champion!`,
        variant: 'default',
      });
    }
  }, [champion, toast]);

  if (!champion) return null;

  const handleShare = () => {
    // In a real app, this would share to social media
    toast({
      title: 'Share functionality',
      description: 'This would share the champion results to social media.',
    });
  };

  return (
    <div className="relative">
      {/* Confetti overlay */}
      {showConfetti && showAnimation && <Confetti />}

      <Card
        className={cn(
          'p-6 max-w-md mx-auto bg-gradient-to-br from-amber-50 to-purple-50 dark:from-amber-900/20 dark:to-purple-900/30',
          'border border-amber-200 dark:border-amber-800',
          'shadow-xl overflow-hidden',
          showAnimation && 'animate-in'
        )}
        style={{ animation: showAnimation ? championAnimation : undefined }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className="absolute -top-1 -left-1 w-full h-full flex items-center justify-center">
              <SeasonalIcon
                defaultIcon={Star}
                winterGlyph="winter-star"
                className="h-24 w-24 text-amber-300 dark:text-amber-500 opacity-30"
                strokeWidth={1}
              />
            </div>
            <SeasonalIcon
              defaultIcon={Trophy}
              winterGlyph="frozen-trophy"
              className="h-16 w-16 text-amber-500 dark:text-amber-400"
              strokeWidth={1.5}
            />
          </div>

          <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-300 mb-1">
            Tournament Champion
          </h2>

          <div className="my-4 flex flex-col items-center">
            {champion.logoUrl || champion.imageUrl ? (
              <div className="w-24 h-24 rounded-full overflow-hidden bg-white dark:bg-gray-800 p-2 border-2 border-amber-300 dark:border-amber-700 shadow-md mb-4">
                <img
                  src={champion.logoUrl || champion.imageUrl}
                  alt={champion.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center border-2 border-amber-300 dark:border-amber-700 shadow-md mb-4">
                <SeasonalIcon
                  defaultIcon={Award}
                  winterGlyph="frozen-trophy"
                  className="h-12 w-12 text-amber-500 dark:text-amber-300"
                />
              </div>
            )}

            <h1 className="text-3xl font-bold text-purple-800 dark:text-purple-300">
              {champion.name}
            </h1>
          </div>

          <div className="flex gap-4 mt-4">
            <Button
              variant="secondary"
              onClick={handleShare}
              className="border border-amber-200 dark:border-amber-800"
            >
              Share Results
            </Button>

            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChampionDisplay;
