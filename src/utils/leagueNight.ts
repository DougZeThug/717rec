/**
 * League night is Thursday.
 *
 * The admin screens that set up a night — Match Creation and Timeslots — should
 * open on the night being planned rather than on today, which is usually a day
 * nobody plays. Today counts when today is Thursday.
 *
 * Noon, not midnight: the date is later combined with a time of day, and a
 * midnight base is one daylight-saving hour away from becoming the day before.
 */
export const nextThursday = (from: Date = new Date()): Date => {
  const THURSDAY = 4;
  const result = new Date(from);
  const daysAway = (THURSDAY - from.getDay() + 7) % 7;
  result.setDate(from.getDate() + daysAway);
  result.setHours(12, 0, 0, 0);
  return result;
};
