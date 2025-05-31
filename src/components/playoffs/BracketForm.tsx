import React from "react";
import { Form } from "@/components/ui/form";
import { Team } from "@/types";
import { useBracketForm } from "./form/useBracketForm";
import { BracketFormValues } from "./form/BracketFormSchema";
import { BracketFormTitle } from "./form/BracketFormTitle";
import { BracketFormDivision } from "./form/BracketFormDivision";
import { BracketFormFormat } from "./form/BracketFormFormat";
import { BracketFormTeamsContainer } from "./form/bracket-teams/components/BracketFormTeamsContainer";
import { BracketFormActions } from "./form/BracketFormActions";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, RefreshCw, Database, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BracketFormProps {
  divisions: { id: string; name: string }[] | undefined;
  teams: Team[] | undefined;
  isSubmitting: boolean;
  onSubmit: (data: BracketFormValues) => Promise<void> | void;
  onCancel: () => void;
}

const BracketForm: React.FC<BracketFormProps> = ({
  divisions,
  teams,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const [formError, setFormError] = React.useState<string | null>(null);

  console.log("BracketForm: Rendering with", { 
    divisionsCount: divisions?.length, 
    teamsCount: teams?.length, 
    isSubmitting 
  });

  // Enhanced loading state with specific indicators
  if (divisions === undefined || teams === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="space-y-2">
            <h3 className="font-medium">Loading Form Data</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              {divisions === undefined && (
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span>Loading divisions...</span>
                </div>
              )}
              {teams === undefined && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Loading teams...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Validate data arrays
  const validDivisions = Array.isArray(divisions) ? divisions : [];
  const validTeams = Array.isArray(teams) ? teams : [];
  
  // Enhanced error handling for divisions
  if (validDivisions.length === 0) {
    return (
      <Alert variant="destructive" className="my-4">
        <Database className="h-4 w-4" />
        <AlertTitle>No Divisions Available</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>You need to create at least one division before creating a bracket.</p>
          <div className="text-sm">
            <p className="font-medium">To fix this:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Go to the Admin Dashboard</li>
              <li>Navigate to the Teams section</li>
              <li>Create or verify divisions exist</li>
            </ul>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh After Creating Divisions
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Enhanced error handling for teams
  if (validTeams.length === 0) {
    return (
      <Alert variant="destructive" className="my-4">
        <Users className="h-4 w-4" />
        <AlertTitle>No Teams Available</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>You need to have teams in your divisions before creating a bracket.</p>
          <div className="text-sm">
            <p className="font-medium">To fix this:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Go to the Teams page</li>
              <li>Create teams and assign them to divisions</li>
              <li>Ensure teams have proper division assignments</li>
            </ul>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh After Adding Teams
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Initialize form with enhanced error handling
  let formHook;
  try {
    formHook = useBracketForm({ teams: validTeams, onSubmit });
  } catch (error) {
    console.error("BracketForm: Error initializing form hook:", error);
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Form Initialization Error</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>Failed to initialize the bracket creation form.</p>
          <div className="text-sm">
            <p className="font-medium">Error details:</p>
            <p className="font-mono text-xs bg-muted p-2 rounded">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const {
    form,
    filteredTeams,
    handleDivisionChange,
    handleSubmit
  } = formHook;

  // Enhanced form submission with specific error handling
  const handleFormSubmit = async (data: any) => {
    try {
      setFormError(null);
      console.log("BracketForm: Submitting form data:", data);
      await handleSubmit(data);
    } catch (error) {
      console.error("BracketForm: Form submission error:", error);
      
      let errorMessage = "An unexpected error occurred";
      
      if (error instanceof Error) {
        if (error.message.includes("validation")) {
          errorMessage = `Validation Error: ${error.message}`;
        } else if (error.message.includes("network")) {
          errorMessage = "Network Error: Please check your connection and try again";
        } else if (error.message.includes("tournament")) {
          errorMessage = `Tournament Creation Error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setFormError(errorMessage);
    }
  };
  
  return (
    <div className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Submission Error</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{formError}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFormError(null)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          <BracketFormTitle form={form} />
          <BracketFormDivision 
            form={form} 
            divisions={validDivisions} 
            onDivisionChange={handleDivisionChange} 
          />
          <BracketFormFormat form={form} />
          <BracketFormTeamsContainer
            maxTeams={form.watch("format") === "Double Elimination" ? 16 : 32}
            onChange={(ids) => form.setValue("teams", ids)}
            divisions={validDivisions}
          />
          <BracketFormActions 
            isSubmitting={isSubmitting} 
            onCancel={onCancel} 
            form={form}
          />
        </form>
      </Form>
    </div>
  );
};

// Change from `export { BracketFormValues }` to `export type { BracketFormValues }`
export type { BracketFormValues };
export default BracketForm;
