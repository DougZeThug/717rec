import { KeyRound, Loader2 } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';

import AuthContainer from '@/components/auth/AuthContainer';
import PageLayout from '@/components/layout/PageLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingState } from '@/components/ui/loading-state';
import { useAuth } from '@/contexts/auth-context';
import { passwordSchema } from '@/hooks/useAuthForm';
import { toast } from '@/hooks/useToast';
import { updatePassword } from '@/services/auth/AuthService';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  invalid: boolean;
  children?: React.ReactNode;
}

/** One labelled password input. Extracted to keep the form's tree shallow. */
const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  disabled,
  invalid,
  children,
}) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="password"
      autoComplete="new-password"
      placeholder="••••••••"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={invalid ? 'border-red-500' : ''}
    />
    {children}
  </div>
);

/**
 * Set a new password after following a recovery link.
 *
 * The link carries its tokens in the URL hash, which the Supabase client
 * consumes on start-up, so by the time this renders there is a real session and
 * `useAuth()` is all that is needed. That also means this page must NOT copy
 * `/auth`'s "redirect away if signed in" rule, or it would bounce the user out
 * before they could set anything. See UX audit X-04.
 */
const ResetPassword: React.FC = () => {
  const { user, authInitialized, isLoading } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0].message);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError(null);
    setIsSubmitting(true);

    try {
      await updatePassword(password);
      toast({
        title: 'Password updated',
        description: 'You are signed in with your new password.',
      });
      navigate('/', { replace: true });
    } catch (error) {
      errorLog('Password update failed:', error);
      setFormError(getUIErrorMessage(error, 'Failed to update your password'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authInitialized || isLoading) {
    return (
      <PageLayout compact>
        <div className="flex justify-center items-center min-h-[calc(100dvh-200px)]">
          <LoadingState message="Checking your reset link..." />
        </div>
      </PageLayout>
    );
  }

  // No session means the link was already used, or the hour has run out. Say so
  // rather than redirecting, which reads as "the link did nothing".
  if (!user) {
    return (
      <PageLayout compact>
        <AuthContainer
          title="This link has expired"
          description="Reset links work once and last one hour."
          footer={
            <Link to="/auth" className="text-sm text-primary underline-offset-4 hover:underline">
              Back to login
            </Link>
          }
        >
          <Button className="w-full" onClick={() => navigate('/forgot-password')}>
            <KeyRound className="mr-2 size-4" />
            Send a new link
          </Button>
        </AuthContainer>
      </PageLayout>
    );
  }

  return (
    <PageLayout compact>
      <AuthContainer
        title="Set a new password"
        description="Choose a password you have not used here before."
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            disabled={isSubmitting}
            invalid={Boolean(passwordError)}
          />
          <PasswordField
            id="confirm-password"
            label="Confirm new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={isSubmitting}
            invalid={Boolean(passwordError)}
          >
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </PasswordField>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save new password'
            )}
          </Button>
        </form>
      </AuthContainer>
    </PageLayout>
  );
};

export default ResetPassword;
