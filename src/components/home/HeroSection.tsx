import { Calendar, History, Trophy, Users } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import SnowtopText from '@/components/typography/SnowtopText';
import { Button } from '@/components/ui/button';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

interface NavButtonProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  className?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ to, icon, label, className }) => (
  <Link
    to={to}
    className={cn(
      'flex items-center gap-2.5 px-4 py-3.5 rounded-xl font-semibold text-sm text-white',
      'transition-all duration-200 active:scale-[0.97] shadow-sm',
      className
    )}
  >
    {icon}
    {label}
  </Link>
);

const HeroSection = () => {
  const { shouldApplyWinter } = useSeasonalTheme();

  return (
    <div>
      {/* Mobile: Compact card hero */}
      <section
        className={cn(
          'md:hidden mx-3 mt-2 rounded-2xl overflow-hidden relative',
          shouldApplyWinter
            ? 'hero-winter'
            : 'bg-gradient-to-br from-[#0f2647] via-cornhole-navy to-[#1d3761]'
        )}
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
        }}
      >
        <div className="relative z-10 flex flex-col items-center text-center px-4 pb-4 pt-2">
          <img
            src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png"
            alt="717 Rec Logo"
            width={64}
            height={64}
            fetchPriority="high"
            loading="eager"
            decoding="sync"
            className="h-12 w-auto max-w-full drop-shadow-sm mb-1.5"
          />
          {shouldApplyWinter ? (
            <SnowtopText
              as="h1"
              className="text-xl uppercase tracking-wide font-normal mb-0.5 leading-tight text-white"
            >
              717Rec
            </SnowtopText>
          ) : (
            <h1 className="text-xl font-bebas uppercase tracking-wide font-normal mb-0.5 leading-tight text-white">
              717Rec
            </h1>
          )}
          <p
            className={cn(
              'text-sm font-sans font-light italic',
              shouldApplyWinter ? 'text-cyan-100/90' : 'text-white/80'
            )}
          >
            Where Bags Fly and Beers Flow.
          </p>
        </div>
      </section>

      {/* Mobile: 2x2 nav grid */}
      <div className="md:hidden grid grid-cols-2 gap-2.5 mx-3 mt-2.5">
        <NavButton
          to="/stats"
          icon={<Trophy size={18} />}
          label="League Stats"
          className="bg-emerald-600 hover:bg-emerald-700"
        />
        <NavButton
          to="/schedule"
          icon={<Calendar size={18} />}
          label="Full Schedule"
          className="bg-blue-600 hover:bg-blue-700"
        />
        <NavButton
          to="/history"
          icon={<History size={18} />}
          label="History"
          className="bg-violet-600 hover:bg-violet-700"
        />
        <NavButton
          to="/teams"
          icon={<Users size={18} />}
          label="My Teams"
          className="bg-amber-600 hover:bg-amber-700"
        />
      </div>

      {/* Desktop: Original full-width hero */}
      <section
        className={cn(
          'hidden md:block text-white py-16 px-4 transition-all duration-200 relative',
          shouldApplyWinter
            ? 'hero-winter icicle-trim'
            : 'bg-gradient-to-br from-[#0f2647] via-cornhole-navy to-[#1d3761]'
        )}
      >
        <div className="absolute inset-0 -z-10 opacity-30 bg-gradient-to-b from-black/5 to-transparent" />

        <div className="max-w-6xl mx-auto text-center flex flex-col items-center font-sans relative z-10">
          <div className="flex justify-center mb-6" style={{ contain: 'layout' }}>
            <img
              src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png"
              alt="717 Rec Logo"
              width={96}
              height={96}
              fetchPriority="high"
              loading="eager"
              decoding="sync"
              className="h-24 w-auto max-w-full transition-all duration-200 drop-shadow-sm"
            />
          </div>
          {shouldApplyWinter ? (
            <SnowtopText
              as="h1"
              className="text-5xl lg:text-6xl uppercase tracking-wide font-normal mb-2 leading-tight"
            >
              717Rec
            </SnowtopText>
          ) : (
            <h1 className="text-5xl lg:text-6xl font-bebas uppercase tracking-wide font-normal mb-2 leading-tight text-white">
              717Rec
            </h1>
          )}
          <p
            className={cn(
              'text-2xl mb-8 max-w-2xl mx-auto font-sans font-light italic',
              shouldApplyWinter ? 'text-cyan-100/90' : 'text-white/90'
            )}
          >
            Where Bags Fly and Beers Flow.
          </p>

          <div className="flex gap-4 justify-center items-center w-full max-w-md mx-auto">
            <Button
              asChild
              size="lg"
              variant="blueOrange"
              className={cn('flex items-center gap-2', shouldApplyWinter && 'btn-winter-primary')}
            >
              <Link to="/stats" className="flex items-center gap-2">
                <Trophy size={20} className="shrink-0" />
                View Standings
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="blueOrange"
              className={cn(
                'flex items-center gap-2',
                shouldApplyWinter
                  ? 'btn-winter-secondary'
                  : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
              )}
            >
              <Link to="/schedule" className="flex items-center gap-2">
                <Calendar size={20} className="shrink-0" />
                See Schedule
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
