import { HeroCardFormData } from '@/types/heroCard';

export interface FormSectionProps {
  formData: HeroCardFormData;
  onChange: <K extends keyof HeroCardFormData>(field: K, value: HeroCardFormData[K]) => void;
}

export interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}
