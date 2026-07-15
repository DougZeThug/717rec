// Re-export from service layer — no direct Supabase calls remain here
export type { BulkTeamCareerData } from '@/services/career/CareerService';
export { fetchAllTeamsCareerData, fetchCareerData } from '@/services/career/CareerService';
