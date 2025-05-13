
import React from "react";
import { Form } from "@/components/ui/form";
import { Team } from "@/types";
import { useBracketForm } from "./form/useBracketForm";
import { BracketFormValues } from "./form/BracketFormSchema";
import { BracketFormTitle } from "./form/BracketFormTitle";
import { BracketFormDivision } from "./form/BracketFormDivision";
import { BracketFormFormat } from "./form/BracketFormFormat";
import { BracketFormChallonge } from "./form/BracketFormChallonge";
import { BracketFormTeams } from "./form/BracketFormTeams";
import { BracketFormActions } from "./form/BracketFormActions";

interface BracketFormProps {
  divisions: { id: string; name: string }[];
  teams: Team[];
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
  const {
    form,
    filteredTeams,
    handleDivisionChange,
    handleSubmit
  } = useBracketForm({ teams, onSubmit });
  
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <BracketFormTitle form={form} />
        <BracketFormDivision 
          form={form} 
          divisions={divisions} 
          onDivisionChange={handleDivisionChange} 
        />
        <BracketFormFormat form={form} />
        <BracketFormChallonge form={form} />
        <BracketFormTeams form={form} teams={filteredTeams} />
        <BracketFormActions isSubmitting={isSubmitting} onCancel={onCancel} />
      </form>
    </Form>
  );
};

// Change from `export { BracketFormValues }` to `export type { BracketFormValues }`
export type { BracketFormValues };
export default BracketForm;
