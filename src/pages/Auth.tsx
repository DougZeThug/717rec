
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageLayout from "@/components/layout/PageLayout";
import { LucideChrome } from "lucide-react"; // Replaced FcGoogle with LucideChrome
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import PageTransition from "@/components/transitions/PageTransition";

interface LocationState {
  returnTo?: string;
}

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Auth = () => {
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  const returnTo = state?.returnTo || "/";
  
  const [activeTab, setActiveTab] = useState<string>("login");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // If user is already logged in, redirect to return path
  React.useEffect(() => {
    if (user) {
      navigate(returnTo);
    }
  }, [user, navigate, returnTo]);

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
      setIsLoading(true);
      await signIn(email, password);
      navigate(returnTo);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      await signUp(email, password);
      toast({
        title: "Verification email sent",
        description: "Please check your email to verify your account.",
      });
      // Navigate will happen automatically on auth state change
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      // Redirect happens at the OAuth provider level
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

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
                        disabled={isLoading}
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
                        disabled={isLoading}
                      />
                      {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Logging in..." : "Login"}
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
                        disabled={isLoading}
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
                        disabled={isLoading}
                      />
                      {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creating account..." : "Create account"}
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
              
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <LucideChrome className="mr-2 h-5 w-5" /> {/* Replaced FcGoogle with LucideChrome */}
                Google
              </Button>
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
