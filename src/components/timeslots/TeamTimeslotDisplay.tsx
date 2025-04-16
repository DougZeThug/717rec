
import React from "react";
import WeekTimeslotDisplay from "./WeekTimeslotDisplay";

interface TeamTimeslotDisplayProps {
  teamId: string;
  teamName: string;
  date?: Date;
}

const TeamTimeslotDisplay: React.FC<TeamTimeslotDisplayProps> = ({ 
  teamId, 
  teamName,
  date = new Date() 
}) => {
  return <WeekTimeslotDisplay teamId={teamId} teamName={teamName} />;
};

export default TeamTimeslotDisplay;
