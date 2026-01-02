import { HeroCardFormData } from "@/types/heroCard";

export interface FormSectionProps {
  formData: HeroCardFormData;
  onChange: (field: keyof HeroCardFormData, value: any) => void;
}

export interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}
