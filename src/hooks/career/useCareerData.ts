// Re-export from service layer — no direct Supabase calls remain here
export type { CareerData, BulkTeamCareerData } from '@/services/career/CareerService';
export { fetchCareerData, fetchAllTeamsCareerData } from '@/services/career/CareerService';
