import { z } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

export const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(1, 'Please select a subject'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const submitContactRequest = async (
  data: ContactFormData,
): Promise<{ error?: string }> => {
  try {
    const { error } = await supabase.functions.invoke('send-support-email', {
      body: data,
    });

    if (error) {
      errorLog('Contact form error:', error);
      return { error: error.message || 'Failed to send message' };
    }

    return {};
  } catch (error) {
    errorLog('Contact form error:', error);
    return { error: 'Failed to send message. Please try again.' };
  }
};
