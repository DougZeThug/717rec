import React from "react";
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Trophy, BarChart3 } from "lucide-react";

export const HelpQuickLinks: React.FC = () => {
  return (
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
  );
};
