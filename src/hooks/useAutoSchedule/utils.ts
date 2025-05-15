
import { formatScheduleDate } from '@/utils/autoSchedule/scheduleUtils';

export const formatDate = (date: Date | null) => {
  return formatScheduleDate(date);
};
