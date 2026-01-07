import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shuffle, Users, Trash2, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { DestructiveIconButton } from "@/components/ui/destructive-icon-button";
import { format, nextThursday } from "date-fns";
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
import SignupsListSkeleton from "./SignupsListSkeleton";

interface SignupToDelete {
  id: string;
  name: string;
}

const BlindDrawSignupsTab: React.FC = () => {
  // Calculate the appropriate Thursday date
  const calculateThursdayDate = () => {
    const now = new Date();
    // Use getDay() directly: 0=Sunday, 4=Thursday
    if (now.getDay() === 4) {
      return format(now, "yyyy-MM-dd");
    }
    return format(nextThursday(now), "yyyy-MM-dd");
  };

  const [selectedDate, setSelectedDate] = useState(calculateThursdayDate);
  const [deletingSignup, setDeletingSignup] = useState<SignupToDelete | null>(null);

  // Recalculate date on every mount to handle tab switching
  useEffect(() => {
    setSelectedDate(calculateThursdayDate());
  }, []);
  const { data: signups, isLoading, error } = useBlindDrawSignups(selectedDate);
  const deleteSignup = useDeleteBlindDrawSignup();
  const clearSignups = useClearBlindDrawSignups();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleConfirmDelete = async () => {
    if (!deletingSignup) return;
    await deleteSignup.mutateAsync(deletingSignup.id);
    setDeletingSignup(null);
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
            <SignupsListSkeleton />
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
                        <DestructiveIconButton
                          onClick={() => setDeletingSignup({
                            id: signup.id,
                            name: `${signup.first_name} ${signup.last_initial}.`
                          })}
                          disabled={deleteSignup.isPending}
                          title="Remove signup"
                          size="sm"
                          className="h-8 w-8 p-0"
                        />
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

      {/* Individual signup delete confirmation */}
      <AlertDialog open={!!deletingSignup} onOpenChange={(open) => !open && setDeletingSignup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Signup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deletingSignup?.name}</strong> from the signup list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSignup.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={deleteSignup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSignup.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlindDrawSignupsTab;
