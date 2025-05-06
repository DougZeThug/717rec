
import { Session, User, WeakPasswordReasons } from "@supabase/supabase-js";
import { UserProfile } from "./user";

// Define the response type for authentication functions
export interface AuthResponse {
  user: User | null;
  session: Session | null;
  weakPassword?: WeakPasswordReasons | null;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  authInitialized: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}
