import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X, Users, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTeams } from "@/hooks/useTeams";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";
import {
  useConfirmationSeason,
  useTeamParticipation,
  useSubmitParticipation,
  ParticipationStatus,
} from "@/hooks/useSeasonParticipation";
import { format } from "date-fns";

const ParticipationHeroCard: React.FC = () => {
  const { shouldApplyWinter } = useSeasonalTheme();
  const { teams, isLoading: teamsLoading } = useTeams();
  const { data: season, isLoading: seasonLoading } = useConfirmationSeason();
  
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<ParticipationStatus | "">("");
  const [isEditing, setIsEditing] = useState(true);
  const [teamSearchOpen, setTeamSearchOpen] = useState(false);

  const { data: existingParticipation, isLoading: participationLoading } = useTeamParticipation(
    season?.id,
    selectedTeamId || undefined
  );

  const submitMutation = useSubmitParticipation();

  // Load existing participation when team is selected
  useEffect(() => {
    if (existingParticipation) {
      setSelectedStatus(existingParticipation.status);
      setIsEditing(false);
    } else {
      setSelectedStatus("");
      setIsEditing(true);
    }
  }, [existingParticipation]);

  // Don't render if no season or not open for confirmation
  if (seasonLoading) {
    return null;
  }

  if (!season) {
    return null;
  }

  const selectedTeam = teams?.find((t) => t.id === selectedTeamId);

  const handleSubmit = async () => {
    if (!selectedTeamId || !selectedStatus || !season?.id) return;

    await submitMutation.mutateAsync({
      seasonId: season.id,
      teamId: selectedTeamId,
      status: selectedStatus,
      submittedByName: selectedTeam?.name,
    });

    setIsEditing(false);
  };

  const baseClasses = cn(
    "relative w-full rounded-xl shadow-md border border-border/30",
    shouldApplyWinter
      ? "winter-card-full overflow-visible bg-gradient-to-br from-cyan-900/90 to-blue-900/90 text-cyan-50"
      : "overflow-hidden bg-gradient-to-br from-primary/90 to-primary/70 text-primary-foreground border-t-[3px] border-t-primary"
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={baseClasses}
    >
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-5 h-5" />
          <h3 className="font-bebas text-xl md:text-2xl uppercase tracking-wide">
            Confirm your team for {season.name}
          </h3>
        </div>

        {/* Form content */}
        <div className="space-y-4">
          {/* Team selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium opacity-90">Select your team</Label>
            <Popover open={teamSearchOpen} onOpenChange={setTeamSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={teamSearchOpen}
                  className={cn(
                    "w-full justify-between bg-background/20 border-white/20 hover:bg-background/30",
                    "text-inherit hover:text-inherit"
                  )}
                  disabled={teamsLoading}
                >
                  {teamsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedTeam ? (
                    selectedTeam.name
                  ) : (
                    "Choose a team..."
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search teams..." />
                  <CommandList>
                    <CommandEmpty>No team found.</CommandEmpty>
                    <CommandGroup>
                      {teams?.map((team) => (
                        <CommandItem
                          key={team.id}
                          value={team.name}
                          onSelect={() => {
                            setSelectedTeamId(team.id);
                            setTeamSearchOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedTeamId === team.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {team.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Status selection - only show when team is selected */}
          {selectedTeamId && isEditing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-3"
            >
              <Label className="text-sm font-medium opacity-90">Will your team be playing?</Label>
              <RadioGroup
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value as ParticipationStatus)}
                className="flex gap-3"
              >
                <Label
                  htmlFor="playing"
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-4 rounded-lg cursor-pointer transition-all",
                    "border-2",
                    selectedStatus === "PLAYING"
                      ? "bg-green-500/30 border-green-400"
                      : "bg-background/10 border-white/20 hover:bg-background/20"
                  )}
                >
                  <RadioGroupItem value="PLAYING" id="playing" className="sr-only" />
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">Playing</span>
                </Label>
                <Label
                  htmlFor="not-playing"
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 p-4 rounded-lg cursor-pointer transition-all",
                    "border-2",
                    selectedStatus === "NOT_PLAYING"
                      ? "bg-red-500/30 border-red-400"
                      : "bg-background/10 border-white/20 hover:bg-background/20"
                  )}
                >
                  <RadioGroupItem value="NOT_PLAYING" id="not-playing" className="sr-only" />
                  <X className="w-5 h-5" />
                  <span className="font-semibold">Not Playing</span>
                </Label>
              </RadioGroup>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={!selectedStatus || submitMutation.isPending}
                className="w-full bg-white/20 hover:bg-white/30 text-inherit border border-white/20"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Submit
              </Button>
            </motion.div>
          )}

          {/* Saved status display */}
          {selectedTeamId && !isEditing && existingParticipation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg",
                  existingParticipation.status === "PLAYING"
                    ? "bg-green-500/20 border border-green-400/30"
                    : "bg-red-500/20 border border-red-400/30"
                )}
              >
                <div className="flex items-center gap-2">
                  {existingParticipation.status === "PLAYING" ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <X className="w-5 h-5 text-red-400" />
                  )}
                  <span className="font-semibold">
                    {existingParticipation.status === "PLAYING" ? "Playing" : "Not Playing"}
                  </span>
                </div>
                <span className="text-sm opacity-70">
                  Saved {format(new Date(existingParticipation.updated_at), "MMM d, h:mm a")}
                </span>
              </div>
              <Button
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="text-sm opacity-80 hover:opacity-100"
              >
                Change response
              </Button>
            </motion.div>
          )}

          {/* Loading state for participation */}
          {selectedTeamId && participationLoading && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ParticipationHeroCard;
