import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

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
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import {
  checkUsernameAvailability,
  profileSchema,
  type ProfileFormData,
  updateProfile,
} from '@/services/profile/ProfileService';

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
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: initialUsername,
      fullName: initialFullName,
    },
  });

  const { isSubmitting } = form.formState;
  const username = form.watch('username');

  // Check username availability
  const handleUsernameAvailabilityCheck = async (value: string) => {
    if (value.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setIsCheckingUsername(true);
    const { available } = await checkUsernameAvailability({
      username: value,
      currentUsername: initialUsername,
    });

    setUsernameAvailable(available);

    if (available === false) {
      form.setError('username', {
        type: 'manual',
        message: 'This name is already taken',
      });
    } else {
      form.clearErrors('username');
    }

    setIsCheckingUsername(false);
  };

  // Debounce username checks
  useEffect(() => {
    if (!username || username.length < 3) return;

    const handler = setTimeout(() => {
      handleUsernameAvailabilityCheck(username);
    }, 500);

    return () => clearTimeout(handler);
  }, [username, initialUsername]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    if (usernameAvailable === false) {
      toast({
        title: 'Invalid first name',
        description: 'Please choose another name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await updateProfile(user.id, data);

      if (error) {
        toast({
          title: 'Error updating profile',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been successfully updated',
      });

      onProfileUpdated();
    } catch {
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
                First Name <span className="text-destructive">*</span>
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input placeholder="Enter your first name" className="pr-10" {...field} />
                </FormControl>
                {field.value.length >= 3 && !isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameAvailable === true ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : null}
                  </div>
                )}
              </div>
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
