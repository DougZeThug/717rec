
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

interface AuthFormProps {
  type: "login" | "signup";
  onSubmit: (email: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  emailError: string | null;
  passwordError: string | null;
  authError: string | null;
}

const AuthForm: React.FC<AuthFormProps> = ({
  type,
  onSubmit,
  isSubmitting,
  emailError,
  passwordError,
  authError
}) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(email, password);
  };

  const buttonText = type === "login" ? "Login" : "Create account";
  const loadingText = type === "login" ? "Logging in..." : "Creating account...";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      {authError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}
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
            {loadingText}
          </>
        ) : (
          buttonText
        )}
      </Button>
    </form>
  );
};

export default AuthForm;
