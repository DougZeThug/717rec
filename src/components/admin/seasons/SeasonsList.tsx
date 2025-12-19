import React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Calendar, Trophy, Archive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SeasonsListProps {
  seasons: any[] | undefined;
  isLoading: boolean;
  onEditSeason: (season: any) => void;
}

const SeasonsList: React.FC<SeasonsListProps> = ({ seasons, isLoading, onEditSeason }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!seasons || seasons.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No seasons found</h3>
          <p className="text-muted-foreground">Create your first season to get started.</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (season: any) => {
    if (season.is_active) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    } else if (season.is_archived) {
      return <Badge variant="secondary">Archived</Badge>;
    } else {
      return <Badge variant="outline">Inactive</Badge>;
    }
  };

  const getStatusIcon = (season: any) => {
    if (season.is_active) {
      return <Calendar className="h-4 w-4 text-green-500" />;
    } else if (season.is_archived) {
      return <Archive className="h-4 w-4 text-gray-500" />;
    } else {
      return <Calendar className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">All Seasons</h3>
      {seasons.map((season) => (
        <Card key={season.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(season)}
                <div>
                  <CardTitle className="text-lg">{season.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(season.start_date).toLocaleDateString()} - 
                    {season.end_date ? new Date(season.end_date).toLocaleDateString() : "Ongoing"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(season)}
                <motion.div whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditSeason(season)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                </motion.div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Created:</span>{" "}
                {new Date(season.created_at).toLocaleDateString()}
              </div>
              {season.champion_team_id && (
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-yellow-500" />
                  <span className="font-medium">Champion designated</span>
                </div>
              )}
              {season.is_archived && (
                <div>
                  <span className="font-medium">Status:</span>{" "}
                  <span className="text-muted-foreground">Archived season</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SeasonsList;
