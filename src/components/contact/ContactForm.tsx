import { Send } from 'lucide-react';
import React, { useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CONTACT_TOPIC_OPTIONS,
  type ContactTopic,
  DEFAULT_CONTACT_TOPIC,
  findContactTopic,
  messageLimitFor,
  nameLimitFor,
} from '@/services/contact/contactTopics';

import { ContactTopicField } from './ContactTopicField';
import { LockableField } from './LockableField';
import { useContactSubmit } from './useContactSubmit';
import { useVerifiedIdentity } from './useVerifiedIdentity';

interface ContactFormProps {
  onSent: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSent }) => {
  const [searchParams] = useSearchParams();

  const [initialTopic] = useState<ContactTopic>(
    () => findContactTopic(searchParams.get('type'))?.value ?? DEFAULT_CONTACT_TOPIC
  );

  const [topicValue, setTopicValue] = useState<ContactTopic>(initialTopic);
  const [players, setPlayers] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');

  const [isSolo, setIsSolo] = useState(() => searchParams.get('solo') === 'true');

  const topic = findContactTopic(topicValue) ?? CONTACT_TOPIC_OPTIONS[0];
  const { isSignedIn, name, team, contact, setName, setTeam, setContact, nameLocked, teamLocked } =
    useVerifiedIdentity({ allowNewTeamName: Boolean(topic.needsTeam) });
  const { errors, isSending, submit } = useContactSubmit(onSent);

  const isAnsweredByEmail = topic.channel === 'support';
  const isJoining = topic.value === 'join_league';
  const showTeam =
    (topic.needsTeam || Boolean(team) || !isAnsweredByEmail) && !(isJoining && isSolo);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submit({
      topic,
      name,
      contact,
      team: isJoining && isSolo ? 'Solo player' : team,
      players: isJoining && isSolo ? name : players,
      message,
      website,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] size-0 opacity-0"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <ContactTopicField topic={topic} onChange={setTopicValue} />

        <LockableField
          id="contact-name"
          label="Name"
          value={name}
          onChange={setName}
          locked={nameLocked}
          maxLength={nameLimitFor(topic)}
          placeholder="Jane Doe"
          error={errors.name}
        />

        <LockableField
          id="contact-contact"
          label={isAnsweredByEmail ? 'Email' : 'Contact (email or phone)'}
          value={contact}
          onChange={setContact}
          locked={false}
          maxLength={255}
          placeholder={isAnsweredByEmail ? 'you@example.com' : 'you@example.com or 717-555-1234'}
          error={errors.contact}
        />

        {isJoining && (
          <div className="flex items-center space-x-2 md:col-span-2 py-1">
            <Checkbox
              id="solo-join"
              checked={isSolo}
              onCheckedChange={(checked) => setIsSolo(checked === true)}
            />
            <Label htmlFor="solo-join" className="cursor-pointer">
              I’m joining solo
            </Label>
          </div>
        )}

        {showTeam && (
          <LockableField
            id="contact-team"
            label={topic.needsTeam ? 'Proposed team name' : 'Team name'}
            value={team}
            onChange={setTeam}
            locked={teamLocked}
            maxLength={120}
            placeholder={topic.needsTeam ? 'Bag Boys' : 'Your team (optional)'}
            error={errors.team}
          />
        )}

        {topic.needsPlayers && !isSolo && (
          <div className="md:col-span-2">
            <Label htmlFor="contact-players">Teammates</Label>
            <Textarea
              id="contact-players"
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Names of teammates joining with you"
              className="mt-1"
            />
          </div>
        )}

        <div className="md:col-span-2">
          <Label htmlFor="contact-message">Message</Label>
          <Textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={messageLimitFor(topic)}
            placeholder="What can we help with?"
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? 'contact-message-error' : undefined}
            className="mt-1"
          />
          {errors.message && (
            <p id="contact-message-error" className="mt-1 text-sm text-destructive-text">
              {errors.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {isSignedIn && (
          <span className="text-xs text-muted-foreground">
            Signed in — your message is marked verified.
          </span>
        )}
        <Button type="submit" disabled={isSending} className="gap-2">
          <Send className="size-4" />
          {isSending ? 'Sending…' : 'Send message'}
        </Button>
      </div>
    </form>
  );
};
