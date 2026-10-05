import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { toast } from '@/hooks/useToast';
import { checkUsernameAvailability, updateProfile } from '@/services/profile/ProfileService';
import { errorLog } from '@/utils/logger';

import { type ProfileFormData, profileSchema } from './profileSchema';

interface ProfileFormProps {
  initialUsername: string;
  initialFullName: string;
  onProfileUpdated: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  initialUsername,
  initialFullName,
  onProfileUpdated,
}) => {
  const { user } = useAuth();
  // Each result keeps the name it was for. A bare boolean outlived the name:
  // after an edit it still said "available" for a value nobody had checked.
  const [availability, setAvailability] = useState<{
    name: string;
    available: boolean | null;
  } | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);
  // Bumped to ask for another check of the same name after one could not answer.
  const [recheckCount, setRecheckCount] = useState<number>(0);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: initialUsername,
      fullName: initialFullName,
    },
  });

  const { isSubmitting } = form.formState;
  const username = useWatch({ control: form.control, name: 'username' });

  // Only a result for the name now in the field counts. undefined means no
  // check has finished for this name; null means one finished but could not
  // answer (the service returns null on an error). Keep the two apart.
  const resultForName = availability?.name === username ? availability.available : undefined;
  const usernameAvailable = resultForName ?? null;
  // An edited name with no result yet. During the 500ms debounce the request
  // has not started, so isCheckingUsername alone does not cover this gap. The
  // saved name is the user's own, so it needs no check.
  const awaitingCheck =
    username.length >= 3 && username !== initialUsername && resultForName === undefined;
  const checkFailed =
    username.length >= 3 && username !== initialUsername && resultForName === null;

  // Numbers each check, so a reply can tell whether a newer check has started.
  // Comparing names was not enough: typing a name, editing away and back made
  // an older in-flight check for the same name look current.
  const latestCheckIdRef = useRef<number>(0);

  // Check username availability. The debounce effect below only calls this for
  // names of 3+ characters, so shorter names never get here.
  const handleUsernameAvailabilityCheck = useCallback(
    async (value: string) => {
      latestCheckIdRef.current += 1;
      const checkId = latestCheckIdRef.current;
      setIsCheckingUsername(true);
      const { available } = await checkUsernameAvailability({
        username: value,
        currentUsername: initialUsername,
      });

      // Ignore stale responses — only apply if this is still the latest check
      if (latestCheckIdRef.current !== checkId) return;

      setAvailability({ name: value, available });

      if (available === false) {
        form.setError('username', {
          type: 'manual',
          message: 'This name is already taken',
        });
      } else {
        form.clearErrors('username');
      }

      setIsCheckingUsername(false);
    },
    [initialUsername, form]
  );

  // Debounce username checks
  useEffect(() => {
    if (!username || username.length < 3) return undefined;

    const handler = setTimeout(() => {
      handleUsernameAvailabilityCheck(username);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [username, recheckCount, handleUsernameAvailabilityCheck]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    if (usernameAvailable === false || isCheckingUsername || awaitingCheck) {
      toast({
        title: 'Invalid first name',
        description:
          isCheckingUsername || awaitingCheck
            ? 'Please wait for the name check to complete'
            : 'Please choose another name',
        variant: 'destructive',
      });
      return;
    }

    // The check finished but could not answer. Say so, and ask again, so the
    // next Save can work once the service is back.
    if (checkFailed) {
      toast({
        title: "Couldn't check this name",
        description: "We couldn't check if this name is free. Try Save again.",
        variant: 'destructive',
      });
      setRecheckCount((count) => count + 1);
      return;
    }

    try {
      await updateProfile(user.id, data);

      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated',
      });

      onProfileUpdated();
    } catch (e) {
      errorLog('Failed to update profile:', e);
      toast({
        title: 'Error updating profile',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                First Name <span className="text-destructive-text">*</span>
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input placeholder="Enter your first name" className="pr-10" {...field} />
                </FormControl>
                {field.value.length >= 3 && !isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameAvailable === true ? (
                      <CheckCircle2 className="size-5 text-green-500" aria-hidden="true" />
                    ) : usernameAvailable === false ? (
                      <AlertCircle className="size-5 text-destructive-text" aria-hidden="true" />
                    ) : null}
                  </div>
                )}
              </div>
              {/* The tick was the only signal that a name is free, so anyone who
                  could not see the colour got no answer at all. The taken case
                  is left to FormMessage below — it already says "This name is
                  already taken", and two live regions would announce it twice. */}
              {field.value.length >= 3 && !isCheckingUsername && usernameAvailable === true && (
                <p role="status" className="text-sm font-medium text-green-600 dark:text-green-400">
                  Name is available
                </p>
              )}
              <FormMessage />
              <FormDescription>This is how you will be identified in the league.</FormDescription>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} />
              </FormControl>
              <FormMessage />
              <FormDescription>Add your full name for better identification</FormDescription>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full mt-6"
          disabled={isSubmitting || username.length < 3}
        >
          {isSubmitting ? 'Saving...' : 'Save Profile'}
        </Button>
      </form>
    </Form>
  );
};

export default ProfileForm;
