import { CheckCircle } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MessageSentCardProps {
  onSendAnother: () => void;
}

/** Replaces the form once a message is on its way. */
export const MessageSentCard: React.FC<MessageSentCardProps> = ({ onSendAnother }) => (
  <Card>
    <CardContent className="pt-12 pb-8 text-center">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-primary/10 rounded-full">
          <CheckCircle className="size-12 text-primary" />
        </div>
      </div>
      <h1 className="text-2xl font-bold mb-2">Message Sent!</h1>
      <p className="text-muted-foreground mb-6">
        Thank you for contacting us. We&apos;ll get back to you within 24-48 hours.
      </p>
      <Button onClick={onSendAnother}>Send Another Message</Button>
    </CardContent>
  </Card>
);
