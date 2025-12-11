import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shuffle, Users, Trash2, Calendar, AlertCircle } from "lucide-react";
import { format, nextThursday, isThursday } from "date-fns";
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
    // If today is Thursday, use today. Otherwise, get the next Thursday.
    if (isThursday(today)) {
      return format(today, "yyyy-MM-dd");
    }
    return format(nextThursday(today), "yyyy-MM-dd");
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
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Shuffle className="h-5 w-5 text-primary" />
              Blind Draw Signups
            </CardTitle>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full w-fit">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary text-sm">
                {signups?.length || 0} signed up
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          {/* Date selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1">
              <Label htmlFor="event-date" className="text-sm font-medium whitespace-nowrap">
                Event Date
              </Label>
              <div className="relative flex-1 sm:max-w-xs">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="event-date"
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="pl-10"
                />
              </div>
            </div>
            {signups && signups.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full sm:w-auto">
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
                    <th className="text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium w-8">#</th>
                    <th className="text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">Name</th>
                    <th className="text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium hidden sm:table-cell">Signed Up</th>
                    <th className="text-right px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {signups.map((signup, index) => (
                    <tr key={signup.id} className="hover:bg-muted/30">
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="font-medium text-sm">{signup.first_name} {signup.last_initial}.</div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {format(new Date(signup.created_at), "MMM d, h:mm a")}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                        {format(new Date(signup.created_at), "MMM d, h:mm a")}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
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
