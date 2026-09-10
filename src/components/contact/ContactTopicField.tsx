import React from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CONTACT_TOPIC_OPTIONS,
  type ContactTopic,
  type ContactTopicDefinition,
} from '@/services/contact/contactTopics';

interface ContactTopicFieldProps {
  topic: ContactTopicDefinition;
  onChange: (topic: ContactTopic) => void;
}

/**
 * "What is this about?" — the first field, and the one that shapes the rest.
 *
 * It replaces the two different pickers the two old forms had (UX audit H-02):
 * a "Request type" on the home page and a "Subject" here. The line underneath
 * says in one sentence what the chosen topic is for, which is what made the old
 * home-page picker easier to answer than this page's was.
 */
export const ContactTopicField: React.FC<ContactTopicFieldProps> = ({ topic, onChange }) => (
  <div className="md:col-span-2">
    <Label htmlFor="contact-topic">What is this about?</Label>
    <Select value={topic.value} onValueChange={(value) => onChange(value as ContactTopic)}>
      <SelectTrigger id="contact-topic" className="mt-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONTACT_TOPIC_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {topic.helper && <p className="mt-1 text-xs text-muted-foreground">{topic.helper}</p>}
  </div>
);
