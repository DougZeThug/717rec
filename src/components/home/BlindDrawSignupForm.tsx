import { Check, Loader2, UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBlindDrawSettings } from '@/hooks/useBlindDrawSettings';
import { useAddBlindDrawSignup } from '@/hooks/useBlindDrawSignups';
import { useToast } from '@/hooks/useToast';

const signupSchema = z.object({
  firstName: z.string().trim().min(1, 'Name required').max(30, 'Too long'),
  lastInitial: z
    .string()
    .trim()
    .length(1, 'Single letter')
    .regex(/^[A-Za-z]$/, 'Letter only'),
});

interface BlindDrawSignupFormProps {
  eventDate: string; // YYYY-MM-DD format
}

const BlindDrawSignupForm: React.FC<BlindDrawSignupFormProps> = ({ eventDate }) => {
  const [firstName, setFirstName] = useState('');
  const [lastInitial, setLastInitial] = useState('');
  const [errors, setErrors] = useState<{ firstName?: string; lastInitial?: string }>({});
  const [isSignedUp, setIsSignedUp] = useState(false);

  const addSignup = useAddBlindDrawSignup();
  const { data: settings } = useBlindDrawSettings();
  const { toast } = useToast();

  const confirmationMessage = settings?.signup_confirmation_message || "You're signed up! See you there!";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({ firstName, lastInitial });
    if (!result.success) {
      const fieldErrors: { firstName?: string; lastInitial?: string } = {};
      result.error.issues.forEach((err) => {
        if (err.path[0] === 'firstName') fieldErrors.firstName = err.message;
        if (err.path[0] === 'lastInitial') fieldErrors.lastInitial = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await addSignup.mutateAsync({
        eventDate,
        firstName: result.data.firstName,
        lastInitial: result.data.lastInitial,
      });
      setIsSignedUp(true);
      setFirstName('');
      setLastInitial('');
      toast({
        title: 'Success',
        description: confirmationMessage,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isSignedUp) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
        <div className="flex items-center justify-center gap-2 text-white">
          <div className="bg-green-500/30 rounded-full p-1">
            <Check className="h-5 w-5 text-green-300" />
          </div>
          <span className="font-semibold">{confirmationMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <UserPlus className="h-4 w-4 text-white" />
        <span className="text-white font-semibold text-sm">Sign Up</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-11 text-base"
              maxLength={30}
            />
            {errors.firstName && (
              <span className="text-xs text-red-300 mt-0.5 block">{errors.firstName}</span>
            )}
          </div>

          <div className="w-14">
            <Input
              type="text"
              placeholder="L.I."
              value={lastInitial}
              onChange={(e) => setLastInitial(e.target.value.slice(0, 1).toUpperCase())}
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50 h-11 text-base text-center"
              maxLength={1}
            />
            {errors.lastInitial && (
              <span className="text-xs text-red-300 mt-0.5 block">{errors.lastInitial}</span>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={addSignup.isPending}
          className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30 h-11 text-base"
        >
          {addSignup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign Up'}
        </Button>
      </form>
    </div>
  );
};

export default BlindDrawSignupForm;
