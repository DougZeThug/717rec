import { z } from 'zod';

import {
  CONTACT_TOPICS,
  findContactTopic,
  messageLimitFor,
  topicNeedsEmail,
} from '@/services/contact/contactTopics';

/**
 * The one message form's rules (UX audit H-02).
 *
 * Three of them depend on the topic, which is why they are refinements rather
 * than field rules: a team name is only required for joining the league, the
 * support inbox emails back so it needs a real address where the league inbox
 * takes a phone number, and the two inboxes accept different message lengths.
 */
export const contactFormSchema = z
  .object({
    topic: z.enum(CONTACT_TOPICS),
    name: z.string().trim().min(2, 'Please give a name of at least 2 characters'),
    contact: z.string().trim().min(1, 'Please give an email address or a phone number'),
    team: z.string().trim().max(120).optional(),
    players: z.string().trim().max(1000).optional(),
    message: z.string().trim().min(10, 'Please write at least 10 characters'),
    // Honeypot: hidden from real users, filled in by bots.
    website: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const topic = findContactTopic(values.topic);
    if (!topic) return;

    if (topic.needsTeam && !values.team) {
      ctx.addIssue({
        code: 'custom',
        path: ['team'],
        message: 'Please give the team name you want to register',
      });
    }

    if (topicNeedsEmail(topic) && !z.string().email().safeParse(values.contact).success) {
      ctx.addIssue({
        code: 'custom',
        path: ['contact'],
        message: 'Please give an email address — this one is answered by email',
      });
    }

    const limit = messageLimitFor(topic);
    if (values.message.length > limit) {
      ctx.addIssue({
        code: 'custom',
        path: ['message'],
        message: `Please keep the message under ${limit} characters`,
      });
    }
  });

export type ContactFormValues = z.infer<typeof contactFormSchema>;
