import { Calendar, Info, MapPin, Users } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import { Button } from '@/components/ui/button';

const Join: React.FC = () => {
  return (
    <>
      <SeoHead
        title="Join the League — 717REC"
        description="Register for the upcoming 717REC cornhole league season starting Jan 7, 2027 at Marion Court Room."
        path="/join"
      />
      <PageLayout className="flex flex-col gap-6 md:gap-10 pb-12" gradientVariant="blueOrange">
        <div className="container mx-auto px-4 max-w-4xl pt-4 md:pt-8">
          <div className="flex flex-col items-center text-center mb-8 md:mb-12">
            <img
              src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png"
              alt="717REC Logo"
              className="w-24 h-24 mb-6 md:w-32 md:h-32 drop-shadow-md"
            />
            <h1 className="text-4xl md:text-5xl font-bebas mb-4 text-foreground">
              Join the League
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl font-light italic">
              Experience Lancaster&apos;s premier recreational cornhole competition.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/contact?type=join_league">Sign up for the league</Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="border-t border-border pt-6">
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Calendar className="w-5 h-5 text-primary" />
                  Season Details
                </h2>
                <p className="text-sm text-muted-foreground">When we play</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-semibold">Jan 7, 2027</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Schedule</span>
                  <span className="font-semibold">Thursdays</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Timeslots</span>
                  <span className="font-semibold">6:00 PM – 10:00 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold">One-hour slots</span>
                </div>
              </div>
            </section>

            <section className="border-t border-border pt-6">
              <div className="mb-4">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <MapPin className="w-5 h-5 text-primary" />
                  Location & Cost
                </h2>
                <p className="text-sm text-muted-foreground">Where and how much</p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col border-b border-border/50 pb-2">
                  <span className="text-muted-foreground mb-1">Location</span>
                  <span className="font-semibold">Marion Court Room</span>
                  <span className="text-sm text-muted-foreground">
                    7 E Marion St, Lancaster PA 17602
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-semibold text-lg text-foreground">$50 per team</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Team Size</span>
                  <span className="font-semibold">2 players (Solo allowed)</span>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-10 flex flex-col items-center gap-6">
            <div className="border-t border-border py-4 flex gap-3 max-w-lg">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Registering a team? You&apos;ll need a team name and both players’ names. Joining
                solo? Let the league know you need a partner.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Button asChild size="lg" className="h-14 px-8 text-lg font-semibold">
                <Link to="/contact?type=join_league">
                  <Users className="mr-2 h-5 w-5" />
                  Join as a Team
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg font-semibold"
              >
                <Link to="/contact?type=join_league&solo=true">Join as a Solo Player</Link>
              </Button>
            </div>
          </div>
        </div>
      </PageLayout>
    </>
  );
};

export default Join;
