import { BracketFormat } from '@/constants/brackets';

export interface BracketFormData {
  title: string;
  divisionId: string;
  format: BracketFormat;
  teams: string[];
}
