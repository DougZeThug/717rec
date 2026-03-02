import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import { DatabaseError } from '@/types/errors';
import { getErrorMessage } from '@/utils/errorHandler';

export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(1, 'Please select a subject'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const submitContactRequest = async (data: ContactFormData): Promise<void> => {
  const { error } = await supabase.functions.invoke('send-support-email', {
    body: data,
  });

  if (error) {
    throw new DatabaseError(`Failed to send message: ${getErrorMessage(error)}`);
  }
};
