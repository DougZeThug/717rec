import { useState } from 'react';

import { toast } from '@/hooks/useToast';
import { submitContactMessage } from '@/services/contact/ContactSubmissionService';
import type { ContactTopicDefinition } from '@/services/contact/contactTopics';
import { trackContactForm } from '@/utils/analytics';
import { getUIErrorMessage } from '@/utils/errorHandler';

import { type ContactFieldErrors, contactFormSchema, toFieldErrors } from './contactFormSchema';

interface ContactDraft {
  topic: ContactTopicDefinition;
  name: string;
  contact: string;
  team: string;
  players: string;
  message: string;
  /** Honeypot. */
  website: string;
}

interface ContactSubmit {
  /** One message per field, replaced on each attempt. */
  errors: ContactFieldErrors;
  isSending: boolean;
  submit: (draft: ContactDraft) => Promise<void>;
}

/**
 * Checks a message and sends it, keeping the form itself free of both.
 *
 * The rules are only run on submit, never per keystroke, so somebody filling
 * the form in is never interrupted by a complaint about a field they have not
 * finished. What comes back is one message per field, which the form puts
 * under the inputs.
 */
export const useContactSubmit = (onSent: () => void): ContactSubmit => {
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [isSending, setIsSending] = useState(false);

  const submit = async (draft: ContactDraft): Promise<void> => {
    const parsed = contactFormSchema.safeParse({ ...draft, topic: draft.topic.value });

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setIsSending(true);
    try {
      await submitContactMessage({
        topic: draft.topic,
        name: parsed.data.name,
        contact: parsed.data.contact,
        team: parsed.data.team ?? null,
        players: parsed.data.players ?? null,
        message: parsed.data.message,
        website: parsed.data.website,
      });
      // Same event name as before the two forms merged, so the history stays
      // comparable; the topic takes the place of the old subject.
      trackContactForm(draft.topic.value);
      onSent();
    } catch (error) {
      toast({
        title: 'Could not send',
        description: getUIErrorMessage(error, 'Failed to send message'),
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return { errors, isSending, submit };
};
