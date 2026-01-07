
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { errorLog } from "@/utils/logger";

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "First name must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "First name can only contain letters, numbers, and underscores"),
  fullName: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialUsername: string;
  initialFullName: string;
  onProfileUpdated: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({
  initialUsername,
  initialFullName,
  onProfileUpdated,
}) => {
  const { user } = useAuth();
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: initialUsername,
      fullName: initialFullName,
    },
  });

  const { isSubmitting } = form.formState;
  const username = form.watch("username");

  // Check username availability
  const checkUsernameAvailability = async (value: string) => {
    if (value.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    try {
      setIsCheckingUsername(true);
      
      // Skip the check if it's their current username
      if (initialUsername === value) {
        setUsernameAvailable(true);
        return;
      }
      
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", value)
        .maybeSingle();
      
      if (error) {
        errorLog("Error checking username:", error);
        setUsernameAvailable(null);
        return;
      }
      
      const isAvailable = !data;
      setUsernameAvailable(isAvailable);
      
      if (!isAvailable) {
        form.setError("username", {
          type: "manual",
          message: "This name is already taken",
        });
      } else {
        form.clearErrors("username");
      }
    } catch (error) {
      errorLog("Unexpected error checking username:", error);
      setUsernameAvailable(null);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Debounce username checks
  useEffect(() => {
    if (!username || username.length < 3) return;
    
    const handler = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);
    
    return () => clearTimeout(handler);
  }, [username, initialUsername]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    
    if (!usernameAvailable) {
      toast({
        title: "Invalid first name",
        description: "Please choose another name",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: data.username,
          full_name: data.fullName || null,
        })
        .eq("id", user.id);
      
      if (error) {
        toast({
          title: "Error updating profile",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
      
      onProfileUpdated();
    } catch (error) {
      errorLog("Error updating profile:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                First Name <span className="text-destructive">*</span>
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    placeholder="Enter your first name"
                    className="pr-10"
                    {...field}
                  />
                </FormControl>
                {field.value.length >= 3 && !isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {usernameAvailable === true ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : null}
                  </div>
                )}
              </div>
              <FormMessage />
              <FormDescription>This is how you will be identified in the league.</FormDescription>
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Your full name" {...field} />
              </FormControl>
              <FormMessage />
              <FormDescription>Add your full name for better identification</FormDescription>
            </FormItem>
          )}
        />
        
        <Button
          type="submit"
          className="w-full mt-6"
          disabled={isSubmitting || username.length < 3}
        >
          {isSubmitting ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </Form>
  );
};

export default ProfileForm;
