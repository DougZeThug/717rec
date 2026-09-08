import { Loader2, MailCheck } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router';

import AuthContainer from '@/components/auth/AuthContainer';
import PageLayout from '@/components/layout/PageLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { emailSchema } from '@/hooks/useAuthForm';
import { resetPassword } from '@/services/auth/AuthService';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

/**
 * Ask for a password reset link.
 *
 * Its own route rather than a third tab on `/auth`, so support can point people
 * at a URL and the sign-in form needs no new state. See UX audit X-04.
 */
const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0].message);
      return;
    }
    setEmailError(null);
    setIsSubmitting(true);

    try {
      await resetPassword(email, `${window.location.origin}/reset-password`);
      setSent(true);
    } catch (error) {
      errorLog('Password reset request failed:', error);
      setFormError(getUIErrorMessage(error, 'Failed to send the password reset email'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout compact={true}>
      <AuthContainer
        title="Reset your password"
        description="We will email you a link to set a new one."
        footer={
          <Link to="/auth" className="text-sm text-primary underline-offset-4 hover:underline">
            Back to login
          </Link>
        }
      >
        {sent ? (
          <div className="space-y-4">
            <Alert>
              <MailCheck className="size-4" />
              <AlertDescription>
                If an account exists for <strong>{email}</strong>, a reset link is on its way. The
                link works once and lasts one hour.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Nothing arrived? Check the spam folder, then try again.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
              Use a different address
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                className={emailError ? 'border-red-500' : ''}
              />
              {emailError && <p className="text-sm text-destructive">{emailError}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>
        )}
      </AuthContainer>
    </PageLayout>
  );
};

export default ForgotPassword;
