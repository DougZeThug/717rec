
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LucideChrome, Smartphone } from "lucide-react";

interface SocialAuthButtonsProps {
  onGoogleSignIn: () => Promise<void>;
  onNativeGoogleSignIn: () => Promise<void>;
  isNative: boolean;
  isSubmitting: boolean;
}

const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onGoogleSignIn,
  onNativeGoogleSignIn,
  isNative,
  isSubmitting
}) => {
  return (
    <>
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
          onClick={onGoogleSignIn}
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
            onClick={onNativeGoogleSignIn}
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
    </>
  );
};

export default SocialAuthButtons;
