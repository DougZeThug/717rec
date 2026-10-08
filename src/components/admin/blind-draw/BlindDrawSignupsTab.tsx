import { AlertCircle, Loader2, Save, Settings, Shuffle, Trash2, Users } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DestructiveIconButton } from '@/components/ui/destructive-icon-button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBlindDrawSettings, useUpdateBlindDrawSettings } from '@/hooks/useBlindDrawSettings';
import {
  useBlindDrawSignups,
  useClearBlindDrawSignups,
  useDeleteBlindDrawSignup,
} from '@/hooks/useBlindDrawSignups';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { formatWithPattern } from '@/utils/formatDateSafe';

// `formatLeagueNight` turns a YYYY-MM-DD key into "Sep 18, 2026". It lives with
// the corrections section because that is where league nights were first named,
// but it knows nothing about corrections. Same shape as `useCorrectionsFilters`
// borrowing `pickDefaultEntryDate` from mass score entry.
import { formatLeagueNight } from '../live-corrections/leagueNight';
import { ALL_NIGHTS, pickDefaultSignupNight, signupNights } from './signupNights';
import SignupsListSkeleton from './SignupsListSkeleton';
import SignupsTable, { SIGNUPS_CELL } from './SignupsTable';

interface SignupToDelete {
  id: string;
  name: string;
}

interface NightSelectProps {
  night: string;
  nights: string[];
  onNightChange: (night: string) => void;
}

const NightSelect: React.FC<NightSelectProps> = ({ night, nights, onNightChange }) => (
  <>
    <label htmlFor="signup-night" className="text-sm font-medium">
      Night
    </label>
    <Select value={night} onValueChange={onNightChange}>
      <SelectTrigger id="signup-night" className="w-[170px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_NIGHTS}>All nights</SelectItem>
        {nights.map((key) => (
          <SelectItem key={key} value={key}>
            {formatLeagueNight(key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </>
);

const SignupCountBadge: React.FC<{ count: number }> = ({ count }) => (
  <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full w-fit">
    <Users className="size-4 text-primary" />
    <span className="font-semibold text-primary text-sm">{count} signed up</span>
  </div>
);

interface SignupsHeaderRowProps extends NightSelectProps {
  count: number;
}

const SignupsHeaderRow: React.FC<SignupsHeaderRowProps> = ({
  night,
  nights,
  onNightChange,
  count,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
      <Shuffle className="size-5 text-primary" />
      Blind Draw Signups
    </CardTitle>
    <div className="flex flex-wrap items-center gap-2">
      <NightSelect night={night} nights={nights} onNightChange={onNightChange} />
      <SignupCountBadge count={count} />
    </div>
  </div>
);

interface RemoveSignupDialogProps {
  signup: SignupToDelete | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const RemoveSignupHeader: React.FC<{ name: string | undefined }> = ({ name }) => (
  <AlertDialogHeader>
    <AlertDialogTitle>Remove Signup</AlertDialogTitle>
    <AlertDialogDescription>
      Are you sure you want to remove <strong>{name}</strong> from the signup list? This action
      cannot be undone.
    </AlertDialogDescription>
  </AlertDialogHeader>
);

const RemoveSignupDialog: React.FC<RemoveSignupDialogProps> = ({
  signup,
  isPending,
  onClose,
  onConfirm,
}) => (
  <AlertDialog open={Boolean(signup)} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent>
      <RemoveSignupHeader name={signup?.name} />
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault();
            onConfirm();
          }}
          disabled={isPending}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Removing...
            </>
          ) : (
            'Remove'
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

interface MessageEditorRowProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSave: () => void;
  canSave: boolean;
  isSaving: boolean;
}

const MessageEditorRow: React.FC<MessageEditorRowProps> = ({
  message,
  onMessageChange,
  onSave,
  canSave,
  isSaving,
}) => (
  <div className="flex gap-2">
    <Input
      id="signup-confirmation-message"
      value={message}
      onChange={(e) => onMessageChange(e.target.value)}
      placeholder="You're signed up! See you there!"
      className="flex-1"
      maxLength={100}
    />
    <Button onClick={onSave} disabled={!canSave} size="sm" className="shrink-0">
      {isSaving ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          <Save className="size-4 mr-1" />
          Save
        </>
      )}
    </Button>
  </div>
);

const BlindDrawSettingsCard: React.FC = () => {
  const { data: settings, isLoading } = useBlindDrawSettings();
  const updateSettings = useUpdateBlindDrawSettings();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
      setMessage(settings.signup_confirmation_message);
    }
  }, [settings]);

  const hasChanges = Boolean(settings && message !== settings.signup_confirmation_message);
  useUnsavedChangesGuard(hasChanges, 'The signup message is not saved. Leave and lose the change?');

  const handleSave = () => {
    if (!settings || !hasChanges) return;
    updateSettings.mutate({ id: settings.id, message });
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="size-5 text-muted-foreground" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="space-y-2">
          <label htmlFor="signup-confirmation-message" className="text-sm font-medium">
            Signup Confirmation Message
          </label>
          <p className="text-xs text-muted-foreground">
            Shown to players after they sign up (toast + inline text)
          </p>
          <MessageEditorRow
            message={message}
            onMessageChange={setMessage}
            onSave={handleSave}
            canSave={hasChanges && !updateSettings.isPending}
            isSaving={updateSettings.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
};

const BlindDrawSignupsTab: React.FC = () => {
  const [deletingSignup, setDeletingSignup] = useState<SignupToDelete | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  // Null means "the admin has not chosen", so the default below applies.
  const [chosenNight, setChosenNight] = useState<string | null>(null);

  const { data: signups, isLoading, error } = useBlindDrawSignups();
  const deleteSignup = useDeleteBlindDrawSignup();
  const clearSignups = useClearBlindDrawSignups();

  // Every night is fetched and the night is narrowed here, the same way the
  // corrections list does it. The query, its key and the service stay as they
  // were — and the `event_date` index was dropped in 20260710190922, so a
  // server-side filter would scan the table anyway.
  const nights = useMemo(() => signupNights(signups ?? []), [signups]);
  const night = chosenNight ?? pickDefaultSignupNight(nights) ?? ALL_NIGHTS;
  const visibleSignups = useMemo(() => {
    if (night === ALL_NIGHTS) return signups ?? [];
    return (signups ?? []).filter((signup) => signup.event_date === night);
  }, [signups, night]);

  const clearsEveryNight = night === ALL_NIGHTS;
  const clearLabel = clearsEveryNight ? 'Clear every night' : `Clear ${formatLeagueNight(night)}`;

  const handleConfirmDelete = async () => {
    if (!deletingSignup) return;
    await deleteSignup.mutateAsync(deletingSignup.id);
    setDeletingSignup(null);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive-text">
            <AlertCircle className="size-5" />
            <span>Failed to load signups. Make sure you have admin access.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <BlindDrawSettingsCard />

      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <SignupsHeaderRow
            night={night}
            nights={nights}
            onNightChange={setChosenNight}
            count={visibleSignups.length}
          />
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6">
          {visibleSignups.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsClearing(true)}
                disabled={clearSignups.isPending}
              >
                <Trash2 className="size-4 mr-1" />
                {clearLabel}
              </Button>
            </div>
          )}

          {isLoading ? (
            <SignupsListSkeleton />
          ) : visibleSignups.length > 0 ? (
            <SignupsTable>
              {visibleSignups.map((signup, index) => (
                <tr key={signup.id} className="hover:bg-muted/30">
                  <td className={`${SIGNUPS_CELL} text-xs sm:text-sm text-muted-foreground`}>
                    {index + 1}
                  </td>
                  <td className={SIGNUPS_CELL}>
                    <div className="font-medium text-sm">
                      {signup.first_name} {signup.last_initial}.
                    </div>
                    {/* The night, not the timestamp: on a phone there is room
                        for one line under the name, and which draw a player is
                        in matters more than the minute they signed up. */}
                    <div className="text-xs text-muted-foreground sm:hidden">
                      {formatLeagueNight(signup.event_date)}
                    </div>
                  </td>
                  <td
                    className={`${SIGNUPS_CELL} text-sm text-muted-foreground hidden sm:table-cell`}
                  >
                    {formatLeagueNight(signup.event_date)}
                  </td>
                  <td
                    className={`${SIGNUPS_CELL} text-sm text-muted-foreground hidden sm:table-cell`}
                    suppressHydrationWarning
                  >
                    {formatWithPattern(signup.created_at, 'MMM d, h:mm a')}
                  </td>
                  <td className={`${SIGNUPS_CELL} text-right`}>
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
                      className="size-8 p-0"
                    />
                  </td>
                </tr>
              ))}
            </SignupsTable>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="size-12 mx-auto mb-2 opacity-30" />
              {/* Name what emptied it. An admin who picked a quiet night should
                  not read it as nobody having signed up for anything. */}
              <p>
                {signups && signups.length > 0
                  ? 'Nobody signed up for that night'
                  : 'No signups yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/*
        The shared prompt rather than a hand-rolled one: it holds itself open
        while the wipe runs, disables both buttons and swaps in "Clearing...".
        The inline dialog this replaces closed the instant it was confirmed, so
        a destructive bulk delete ran with nothing on screen saying so, and a
        failure left only a toast that faded. `onSuccess`, not `onSettled`, so a
        failure leaves the prompt open to retry — matching Remove below.
      */}
      <ConfirmDialog
        open={isClearing}
        onOpenChange={setIsClearing}
        title={clearsEveryNight ? 'Clear every night?' : 'Clear this night?'}
        description={
          clearsEveryNight
            ? `This will remove all ${visibleSignups.length} signups, for every night, not just tonight. This action cannot be undone.`
            : `This will remove the ${visibleSignups.length} signups for ${formatLeagueNight(night)}. Other nights are left alone. This action cannot be undone.`
        }
        onConfirm={() =>
          clearSignups.mutate(clearsEveryNight ? undefined : night, {
            onSuccess: () => setIsClearing(false),
          })
        }
        isPending={clearSignups.isPending}
        confirmLabel={clearLabel}
        pendingLabel="Clearing..."
      />

      <RemoveSignupDialog
        signup={deletingSignup}
        isPending={deleteSignup.isPending}
        onClose={() => setDeletingSignup(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default BlindDrawSignupsTab;
