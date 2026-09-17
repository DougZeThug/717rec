import { HeroCardFormData } from '@/types/heroCard';

export interface FormSectionProps {
  formData: HeroCardFormData;
  onChange: <K extends keyof HeroCardFormData>(field: K, value: HeroCardFormData[K]) => void;
  /**
   * What is wrong with the "Extra Data (JSON)" box, or null when nothing is.
   *
   * Parsed once by the form and handed down, so every section agrees about it
   * and none of them parses in its own render.
   */
  metadataError?: string | null;
}

export interface SectionHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}
