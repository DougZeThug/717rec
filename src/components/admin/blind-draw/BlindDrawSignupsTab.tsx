import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shuffle, Users, Trash2, Calendar, AlertCircle } from "lucide-react";
import { format, addDays, nextThursday } from "date-fns";
import {
  useBlindDrawSignups,
  useDeleteBlindDrawSignup,
  useClearBlindDrawSignups,
} from "@/hooks/useBlindDrawSignups";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BlindDrawSignupsTab: React.FC = () => {
  // Default to next Thursday
  const getNextThursday = () => {
    const today = new Date();
    const thursday = nextThursday(today);
    return format(thursday, "yyyy-MM-dd");
  };

  const [selectedDate, setSelectedDate] = useState(getNextThursday());
  const { data: signups, isLoading, error } = useBlindDrawSignups(selectedDate);
  const deleteSignup = useDeleteBlindDrawSignup();
  const clearSignups = useClearBlindDrawSignups();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load signups. Make sure you have admin access.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-primary" />
              Blind Draw Signups
            </CardTitle>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">
                {signups?.length || 0} signed up
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date selector */}
          <div className="flex items-center gap-3">
            <Label htmlFor="event-date" className="text-sm font-medium whitespace-nowrap">
              Event Date
            </Label>
            <div className="relative flex-1 max-w-xs">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="event-date"
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="pl-10"
              />
            </div>
            {signups && signups.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all signups?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all {signups.length} signups for{" "}
                      {format(new Date(selectedDate), "MMMM d, yyyy")}. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearSignups.mutate(selectedDate)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Signups list */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : signups && signups.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-sm font-medium">#</th>
                    <th className="text-left px-4 py-2 text-sm font-medium">Name</th>
                    <th className="text-left px-4 py-2 text-sm font-medium">Signed Up</th>
                    <th className="text-right px-4 py-2 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {signups.map((signup, index) => (
                    <tr key={signup.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-sm text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {signup.first_name} {signup.last_initial}.
                      </td>
                      <td className="px-4 py-2 text-sm text-muted-foreground">
                        {format(new Date(signup.created_at), "MMM d, h:mm a")}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSignup.mutate(signup.id)}
                          disabled={deleteSignup.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No signups yet for {format(new Date(selectedDate), "MMMM d, yyyy")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BlindDrawSignupsTab;
