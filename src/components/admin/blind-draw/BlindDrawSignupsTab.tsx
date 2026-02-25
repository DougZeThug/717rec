import { format } from 'date-fns';
import { AlertCircle, Loader2, Shuffle, Trash2, Users } from 'lucide-react';
import React, { useState } from 'react';

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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DestructiveIconButton } from '@/components/ui/destructive-icon-button';
import {
  useBlindDrawSignups,
  useClearBlindDrawSignups,
  useDeleteBlindDrawSignup,
} from '@/hooks/useBlindDrawSignups';

import SignupsListSkeleton from './SignupsListSkeleton';

interface SignupToDelete {
  id: string;
  name: string;
}

const BlindDrawSignupsTab: React.FC = () => {
  const [deletingSignup, setDeletingSignup] = useState<SignupToDelete | null>(null);

  const { data: signups, isLoading, error } = useBlindDrawSignups();
  const deleteSignup = useDeleteBlindDrawSignup();
  const clearSignups = useClearBlindDrawSignups();

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
          {/* Clear All button */}
          {signups && signups.length > 0 && (
            <div className="flex justify-end">
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
                      This will remove all {signups.length} signups. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => clearSignups.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Clear All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Signups list */}
          {isLoading ? (
            <SignupsListSkeleton />
          ) : signups && signups.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium w-8">
                      #
                    </th>
                    <th className="text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium">
                      Name
                    </th>
                    <th className="text-left px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium hidden sm:table-cell">
                      Signed Up
                    </th>
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
                        <div className="font-medium text-sm">
                          {signup.first_name} {signup.last_initial}.
                        </div>
                        <div className="text-xs text-muted-foreground sm:hidden">
                          {format(new Date(signup.created_at), 'MMM d, h:mm a')}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-sm text-muted-foreground hidden sm:table-cell">
                        {format(new Date(signup.created_at), 'MMM d, h:mm a')}
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right">
                        <DestructiveIconButton
                          onClick={() =>
                            setDeletingSignup({
                              id: signup.id,
                              name: `${signup.first_name} ${signup.last_initial}.`,
                            })
                          }
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
              <p>No signups yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual signup delete confirmation */}
      <AlertDialog
        open={!!deletingSignup}
        onOpenChange={(open) => !open && setDeletingSignup(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Signup</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deletingSignup?.name}</strong> from the
              signup list? This action cannot be undone.
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
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlindDrawSignupsTab;
