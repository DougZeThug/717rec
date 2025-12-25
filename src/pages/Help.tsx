import React from "react";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Users,
  Trophy,
  ListChecks,
  LayoutGrid,
  Shuffle,
  HelpCircle,
  Settings,
  BarChart3,
  MessageSquare,
  Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdminAccess } from "@/hooks/useAdminAccess";

const Help: React.FC = () => {
  const { isAdminAccessGranted } = useAdminAccess();

  return (
    <>
      <Helmet>
        <title>Help & Getting Started | 717REC</title>
        <meta
          name="description"
          content="Learn how to use 717REC - your guide to league management, standings, schedules, and playoffs."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Help & Getting Started</h1>
          </div>
          <p className="text-muted-foreground">
            Everything you need to know about using 717REC for league management
            and participation.
          </p>
        </div>

        {/* Quick Links */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Quick Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link to="/teams">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Teams
                </Button>
              </Link>
              <Link to="/schedule">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </Link>
              <Link to="/stats">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Standings
                </Button>
              </Link>
              <Link to="/playoffs">
                <Button variant="outline" className="w-full justify-start">
                  <Trophy className="h-4 w-4 mr-2" />
                  Playoffs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Accordion type="single" collapsible className="space-y-4">
          {/* Welcome Section */}
          <AccordionItem value="welcome" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Welcome to 717REC</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4 text-sm">
                <p>
                  717REC is your central hub for managing and participating in
                  recreational cornhole leagues. Whether you're an admin running
                  the league or a player tracking your team's progress, this
                  guide will help you get started.
                </p>
                <div className="grid gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <strong>Public Visitors:</strong> View standings, schedules,
                    team stats, and playoff brackets.
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <strong>Players:</strong> Access all public features plus
                    the message board and team details.
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <strong>Admins:</strong> Full access to league management
                    including scoring, scheduling, and season configuration.
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Viewing Standings */}
          <AccordionItem value="standings" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Viewing Standings & Stats</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4 text-sm">
                <p>
                  The Standings page shows team rankings based on wins, losses,
                  and power scores.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Power Score:</strong> A composite ranking that
                    factors in win percentage and strength of schedule.
                  </li>
                  <li>
                    <strong>SOS (Strength of Schedule):</strong> Measures the
                    difficulty of opponents faced.
                  </li>
                  <li>
                    <strong>Game Differential:</strong> Total games won minus
                    games lost.
                  </li>
                </ul>
                <p>
                  Click on any team to view their detailed stats, match history,
                  and head-to-head records.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Schedule */}
          <AccordionItem value="schedule" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Understanding the Schedule</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4 text-sm">
                <p>
                  The Schedule page displays all matches organized by date and
                  round.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Filter by division or specific weeks</li>
                  <li>View match times and locations</li>
                  <li>See completed match scores</li>
                  <li>Track upcoming matchups</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Teams */}
          <AccordionItem value="teams" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Team Pages</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4 text-sm">
                <p>Each team has a dedicated page showing:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Stats Tab:</strong> Win/loss record, power score,
                    and season performance
                  </li>
                  <li>
                    <strong>Matches Tab:</strong> Complete match history with
                    scores
                  </li>
                  <li>
                    <strong>H2H Tab:</strong> Head-to-head records against other
                    teams
                  </li>
                  <li>
                    <strong>Achievements Tab:</strong> Awards and milestones
                  </li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Playoffs */}
          <AccordionItem value="playoffs" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Playoff Brackets</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4 text-sm">
                <p>
                  The Playoffs page shows tournament brackets for each division.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Double Elimination:</strong> Teams must lose twice
                    to be eliminated
                  </li>
                  <li>
                    <strong>Winners Bracket:</strong> Teams with no losses
                  </li>
                  <li>
                    <strong>Losers Bracket:</strong> Teams fighting back after
                    one loss
                  </li>
                  <li>
                    <strong>Grand Finals:</strong> Championship match between
                    bracket winners
                  </li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Message Board */}
          <AccordionItem value="messages" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Message Board</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4 text-sm">
                <p>
                  The message board is where league members can communicate,
                  post updates, and engage with the community.
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Post announcements and updates</li>
                  <li>React to messages with emojis</li>
                  <li>Filter by category or team</li>
                  <li>Search for specific topics</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* History */}
          <AccordionItem value="history" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">League History</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4 text-sm">
                <p>
                  The History page preserves the legacy of past seasons,
                  including:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Past season champions and runners-up</li>
                  <li>Historical standings and records</li>
                  <li>Career statistics across seasons</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Admin Section - Only show if admin */}
          {isAdminAccessGranted && (
            <>
              <div className="pt-4 pb-2">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Admin Guide
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  League management tools and workflows
                </p>
              </div>

              <AccordionItem
                value="admin-setup"
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Settings className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold">Setting Up a Season</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <ol className="list-decimal pl-5 space-y-3">
                      <li>
                        <strong>Create a Season:</strong> Go to Admin → Season
                        tab and create a new season with start date.
                      </li>
                      <li>
                        <strong>Add Teams:</strong> Use the Teams tab to add
                        teams and assign them to divisions.
                      </li>
                      <li>
                        <strong>Set Up Timeslots:</strong> Define available
                        match times in the Timeslots tab.
                      </li>
                      <li>
                        <strong>Generate Schedule:</strong> Use Auto Schedule to
                        automatically create balanced matchups.
                      </li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="admin-scoring"
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ListChecks className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold">Recording Scores</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <ol className="list-decimal pl-5 space-y-3">
                      <li>
                        <strong>Mass Scores:</strong> Use the Scores tab to
                        enter multiple match results at once.
                      </li>
                      <li>
                        <strong>Individual Games:</strong> Enter game-by-game
                        scores for best-of series.
                      </li>
                      <li>
                        <strong>Pending Scores:</strong> Review and approve
                        player-submitted scores in the Pending tab.
                      </li>
                    </ol>
                    <p className="text-muted-foreground">
                      Tip: Scores automatically update team stats and standings.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="admin-playoffs"
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold">Managing Playoffs</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <ol className="list-decimal pl-5 space-y-3">
                      <li>
                        <strong>Create Bracket:</strong> From the Playoffs page,
                        create a new bracket for a division.
                      </li>
                      <li>
                        <strong>Seed Teams:</strong> Auto-seed by standings or
                        manually assign seeds.
                      </li>
                      <li>
                        <strong>Update Scores:</strong> Click on matches to
                        enter results and advance winners.
                      </li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="admin-hero"
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <LayoutGrid className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold">Hero Cards</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <p>
                      Hero cards appear on the homepage to highlight important
                      announcements, upcoming events, or featured content.
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Create cards with custom titles, images, and links</li>
                      <li>Set visibility and ordering</li>
                      <li>Use different card types for various content</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="admin-blind-draw"
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Shuffle className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold">Blind Draw Events</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 text-sm">
                    <p>
                      Blind draw events randomly pair players for casual
                      tournaments.
                    </p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>View signups for upcoming blind draw dates</li>
                      <li>Manage participant lists</li>
                      <li>Export data for pairing</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </>
          )}

          {/* FAQ */}
          <AccordionItem value="faq" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <span className="font-semibold">Frequently Asked Questions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium">
                    How is the Power Score calculated?
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Power Score combines win percentage (70%) and strength of
                    schedule (30%) to create a balanced ranking metric.
                  </p>
                </div>
                <div>
                  <p className="font-medium">
                    What does SOS (Strength of Schedule) mean?
                  </p>
                  <p className="text-muted-foreground mt-1">
                    SOS measures the average win percentage of all opponents
                    you've faced. A higher SOS means you've played tougher
                    competition.
                  </p>
                </div>
                <div>
                  <p className="font-medium">How do playoff seeds work?</p>
                  <p className="text-muted-foreground mt-1">
                    Seeds are typically based on regular season standings or
                    power rankings. Higher seeds get favorable bracket
                    positions.
                  </p>
                </div>
                <div>
                  <p className="font-medium">
                    Can I see my team's historical performance?
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Yes! Visit the History page to view past seasons, or check
                    your team's page for career statistics.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Admin CTA */}
        {isAdminAccessGranted && (
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Ready to manage your league?</h3>
                  <p className="text-sm text-muted-foreground">
                    Head to the Admin Dashboard to get started.
                  </p>
                </div>
                <Link to="/admin">
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default Help;
