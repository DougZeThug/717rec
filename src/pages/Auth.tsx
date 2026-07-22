import React, { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

import AuthContainer from '@/components/auth/AuthContainer';
import AuthForm from '@/components/auth/AuthForm';
import SocialAuthButtons from '@/components/auth/SocialAuthButtons';
import PageLayout from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { useAuthForm } from '@/hooks/useAuthForm';
import { useNativePlatform } from '@/hooks/useNativePlatform';
import { sanitizeReturnTo } from '@/utils/auth/sanitizeReturnTo';
import { authLog } from '@/utils/logger';

interface LocationState {
  returnTo?: string;
}

interface AuthFooterProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AuthFooter: React.FC<AuthFooterProps> = ({ activeTab, setActiveTab }) => (
  <p className="py-1">
    {activeTab === 'login' ? (
      <>
        Don&apos;t have an account?{' '}
        <button
          type="button"
          className="text-primary hover:underline py-2 px-1 -my-2"
          onClick={() => setActiveTab('signup')}
        >
          Sign up
        </button>
      </>
    ) : (
      <>
        Already have an account?{' '}
        <button
          type="button"
          className="text-primary hover:underline py-2 px-1 -my-2"
          onClick={() => setActiveTab('login')}
        >
          Login
        </button>
      </>
    )}
  </p>
);

const Auth = () => {
  const { user, authInitialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as LocationState | undefined;
  const returnTo = sanitizeReturnTo(searchParams.get('next') ?? state?.returnTo);

  const { isNative } = useNativePlatform();
  const {
    activeTab,
    setActiveTab,
    isSubmitting,
    emailError,
    passwordError,
    authError,
    handleSignIn,
    handleSignUp,
    handleGoogleSignIn,
    handleNativeGoogleSignIn,
  } = useAuthForm();

  // If user is already logged in, redirect to return path
  useEffect(() => {
    // Only redirect if authentication check has completed
    if (authInitialized && user) {
      authLog('User already logged in, redirecting to:', returnTo);
      navigate(returnTo);
    }
  }, [user, navigate, returnTo, authInitialized]);

  return (
    <PageLayout compact={true}>
      <AuthContainer footer={<AuthFooter activeTab={activeTab} setActiveTab={setActiveTab} />}>
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <AuthForm
              type="login"
              onSubmit={handleSignIn}
              isSubmitting={isSubmitting}
              emailError={emailError}
              passwordError={passwordError}
              authError={authError}
            />
          </TabsContent>

          <TabsContent value="signup">
            <AuthForm
              type="signup"
              onSubmit={handleSignUp}
              isSubmitting={isSubmitting}
              emailError={emailError}
              passwordError={passwordError}
              authError={authError}
            />
          </TabsContent>
        </Tabs>

        <SocialAuthButtons
          onGoogleSignIn={() => handleGoogleSignIn(returnTo)}
          onNativeGoogleSignIn={handleNativeGoogleSignIn}
          isNative={isNative}
          isSubmitting={isSubmitting}
        />
      </AuthContainer>
    </PageLayout>
  );
};

export default Auth;
