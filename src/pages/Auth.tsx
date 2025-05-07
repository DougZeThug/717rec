
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, LucideChrome, Smartphone } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import PageTransition from "@/components/transitions/PageTransition";
import { isNativePlatform } from "@/utils/nativeAuth";

interface LocationState {
  returnTo?: string;
}

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const { 
    signIn, 
    signUp, 
    signInWithGoogle, 
    signInWithGoogleNative,
    user, 
    isLoading, 
    authInitialized, 
    authError, 
    clearAuthError 
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const returnTo = state?.returnTo || "/";
  
  const [activeTab, setActiveTab] = useState<string>("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isNative, setIsNative] = useState<boolean>(false);
  
  // Check if we're on a native platform
  useEffect(() => {
    setIsNative(isNativePlatform());
  }, []);

  // If user is already logged in, redirect to return path
  useEffect(() => {
    // Only redirect if authentication check has completed
    if (authInitialized && user) {
      console.log("User already logged in, redirecting to:", returnTo);
      navigate(returnTo);
    }
  }, [user, navigate, returnTo, authInitialized]);

  // Clear form errors when switching tabs
  useEffect(() => {
    setEmailError(null);
    setPasswordError(null);
    clearAuthError();
  }, [activeTab, clearAuthError]);

  const validateForm = () => {
    let isValid = true;
    
    // Validate email
    try {
      emailSchema.parse(email);
      setEmailError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
        isValid = false;
      }
    }
    
    // Validate password
    try {
      passwordSchema.parse(password);
      setPasswordError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setPasswordError(error.errors[0].message);
        isValid = false;
      }
    }
    
    return isValid;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      const response = await signIn(email, password);
      
      if (response.session) {
        navigate(returnTo);
      }
    } catch (error) {
      console.error(error);
      // Error is already handled in the signIn function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      const response = await signUp(email, password);
      
      if (response.session) {
        toast({
          title: "Account created",
          description: "Please check your email to verify your account.",
        });
      }
      // Navigate will happen automatically on auth state change
    } catch (error) {
      console.error(error);
      // Error is already handled in the signUp function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      // Redirect happens at the OAuth provider level
    } catch (error) {
      console.error(error);
      // Error is already handled in the signInWithGoogle function
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNativeGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      const { success, error } = await signInWithGoogleNative();
      
      if (success) {
        // Success message is already shown in the auth context
        // Navigation will happen automatically on auth state change
        console.log("Native Google login successful, redirecting...");
        // The auth state change will trigger navigation
      } else {
        console.error("Native Google login error:", error);
        toast({
          title: "Login Failed",
          description: error?.message || "Google login failed. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Exception during native Google login:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred during login",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If auth is still initializing, don't show anything yet
  if (!authInitialized && isLoading) {
    return null; // Or a loading spinner if preferred
  }

  return (
    <PageLayout compact={true}>
      <PageTransition>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Welcome to 717Rec</CardTitle>
              <CardDescription>
                Login or create an account to access all features
              </CardDescription>
            </CardHeader>
            <CardContent>
              {authError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
              
              <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        className={emailError ? "border-red-500" : ""}
                      />
                      {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        className={passwordError ? "border-red-500" : ""}
                      />
                      {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Login"
                      )}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        className={emailError ? "border-red-500" : ""}
                      />
                      {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        className={passwordError ? "border-red-500" : ""}
                      />
                      {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-muted"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {/* Web Google Sign In */}
                <Button
                  variant="outline"
                  type="button"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LucideChrome className="mr-2 h-5 w-5" />
                  )}
                  Google
                </Button>
                
                {/* Native Google Sign In - only shown on mobile devices */}
                {isNative && (
                  <Button
                    variant="outline"
                    type="button"
                    className="w-full"
                    onClick={handleNativeGoogleSignIn}
                    disabled={isSubmitting}
                    aria-label="Google Login"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Smartphone className="mr-2 h-5 w-5" />
                    )}
                    Google (Native)
                  </Button>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-center text-sm text-muted-foreground">
              {activeTab === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab("signup")}
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setActiveTab("login")}
                  >
                    Login
                  </button>
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </PageTransition>
    </PageLayout>
  );
};

export default Auth;
