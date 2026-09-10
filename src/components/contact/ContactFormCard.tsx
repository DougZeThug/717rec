import { Mail } from 'lucide-react';
import React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ContactForm } from './ContactForm';

interface ContactFormCardProps {
  onSent: () => void;
}

/** The form, and the line saying where what you write ends up. */
export const ContactFormCard: React.FC<ContactFormCardProps> = ({ onSent }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Mail className="size-5" />
        Send us a message
      </CardTitle>
      <CardDescription>
        Pick what it is about and the form asks for what the league needs. Your message reaches the
        admins&apos; inbox and they are emailed about it.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ContactForm onSent={onSent} />
    </CardContent>
  </Card>
);
