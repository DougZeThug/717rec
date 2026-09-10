import { submitContactRequest } from '@/services/support/ContactService';

import { ContactRequestService } from './ContactRequestService';
import type { ContactTopicDefinition } from './contactTopics';

export interface ContactSubmission {
  topic: ContactTopicDefinition;
  name: string;
  /** An email address, or a phone number for a league topic. */
  contact: string;
  team?: string | null;
  players?: string | null;
  message: string;
  /** Honeypot. Bots fill it; both edge functions check it. */
  website?: string;
}

/**
 * Sends one message to whichever inbox its topic belongs in.
 *
 * The reader fills in one form (UX audit H-02). Behind it the league's request
 * inbox and the support inbox are still separate: they have different edge
 * functions, different tables and different rules — the league one verifies who
 * is asking from their signed-in profile, the support one emails the admins.
 * Merging them is a database change and was deliberately not part of this.
 *
 * Both services already throw, so nothing is caught here.
 */
export const submitContactMessage = async (submission: ContactSubmission): Promise<void> => {
  const { topic } = submission;

  if (topic.channel === 'support') {
    await submitContactRequest({
      name: submission.name,
      email: submission.contact,
      subject: topic.subject ?? 'other',
      message: submission.message,
      website: submission.website ?? '',
    });
    return;
  }

  await ContactRequestService.submit({
    request_type: topic.requestType ?? 'general',
    submitter_name: submission.name,
    submitter_team: submission.team?.trim() || null,
    submitter_contact: submission.contact,
    players: topic.needsPlayers ? submission.players?.trim() || null : null,
    message: submission.message,
    website: submission.website ?? '',
  });
};
