
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageLayout from "@/components/layout/PageLayout";
import AuthContainer from "@/components/auth/AuthContainer";
import AuthForm from "@/components/auth/AuthForm";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { useAuthForm } from "@/hooks/useAuthForm";
import { useNativePlatform } from "@/hooks/useNativePlatform";
import { authLog } from "@/utils/logger";

interface LocationState {
  returnTo?: string;
}

const Auth = () => {
  const { user, authInitialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const returnTo = state?.returnTo || "/";
  
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
    handleNativeGoogleSignIn
  } = useAuthForm({ returnTo });

  // If user is already logged in, redirect to return path
  useEffect(() => {
    // Only redirect if authentication check has completed
    if (authInitialized && user) {
      authLog("User already logged in, redirecting to:", returnTo);
      navigate(returnTo);
    }
  }, [user, navigate, returnTo, authInitialized]);

  // Footer content with tab switching
  const renderFooter = () => (
    <p className="py-1">
      {activeTab === "login" ? (
        <>
          Don't have an account?{" "}
          <button
            type="button"
            className="text-primary hover:underline py-2 px-1 -my-2"
            onClick={() => setActiveTab("signup")}
          >
            Sign up
          </button>
        </>
      ) : (
        <>
          Already have an account?{" "}
          <button
            type="button"
            className="text-primary hover:underline py-2 px-1 -my-2"
            onClick={() => setActiveTab("login")}
          >
            Login
          </button>
        </>
      )}
    </p>
  );

  return (
    <PageLayout compact={true}>
      <AuthContainer footer={renderFooter()}>
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
          onGoogleSignIn={handleGoogleSignIn}
          onNativeGoogleSignIn={handleNativeGoogleSignIn}
          isNative={isNative}
          isSubmitting={isSubmitting}
        />
      </AuthContainer>
    </PageLayout>
  );
};

export default Auth;
