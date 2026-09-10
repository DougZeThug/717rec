import { Send } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { toast } from '@/hooks/useToast';
import { submitContactMessage } from '@/services/contact/ContactSubmissionService';
import {
  CONTACT_TOPIC_OPTIONS,
  type ContactTopic,
  DEFAULT_CONTACT_TOPIC,
  findContactTopic,
  messageLimitFor,
} from '@/services/contact/contactTopics';
import { trackContactForm } from '@/utils/analytics';
import { getUIErrorMessage } from '@/utils/errorHandler';

import { contactFormSchema, type ContactFormValues } from './contactFormSchema';
import { LockableField } from './LockableField';

interface ContactFormProps {
  onSent: () => void;
}

type FieldErrors = Partial<Record<'name' | 'contact' | 'team' | 'message', string>>;

/**
 * The league's one message form (UX audit H-02).
 *
 * There used to be two — one at the bottom of the home page for league
 * business, one here for support — with different fields, and each told the
 * reader to use the other. This is their union: a "What is this about?" list
 * whose answer decides which fields appear and which inbox it lands in.
 *
 * A signed-in member's name and team come from their profile and lock, the way
 * the home form did, so the league can still tell a verified request from an
 * anonymous one.
 */
export const ContactForm: React.FC<ContactFormProps> = ({ onSent }) => {
  const { user } = useAuth();
  const { activeMembership: membership } = useTeamMembership();
  const [searchParams] = useSearchParams();

  // Read once, on arrival. `?type=` seeds the picker; after that the picker is
  // the reader's, so mirroring it back would fight them.
  const [initialTopic] = useState<ContactTopic>(
    () => findContactTopic(searchParams.get('type'))?.value ?? DEFAULT_CONTACT_TOPIC
  );

  const [topicValue, setTopicValue] = useState<ContactTopic>(initialTopic);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [teamDraft, setTeamDraft] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<string | null>(null);
  const [players, setPlayers] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSending, setIsSending] = useState(false);

  const verifiedName = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    return meta?.full_name || meta?.name || user?.email || '';
  }, [user]);
  const verifiedTeam = membership?.team?.name ?? '';

  const topic = findContactTopic(topicValue) ?? CONTACT_TOPIC_OPTIONS[0];
  const name = nameDraft ?? (user ? verifiedName : '');
  const team = teamDraft ?? (user ? verifiedTeam : '');
  const contact = contactDraft ?? user?.email ?? '';

  const nameLocked = Boolean(user) && Boolean(verifiedName) && name === verifiedName;
  // Joining the league always lets them propose a new team name.
  const teamLocked =
    Boolean(user) && Boolean(verifiedTeam) && team === verifiedTeam && !topic.needsTeam;
  const showTeam = topic.needsTeam || Boolean(team) || topic.channel === 'league';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsed = contactFormSchema.safeParse({
      topic: topic.value,
      name,
      contact,
      team,
      players,
      message,
      website,
    });

    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'name' || field === 'contact' || field === 'team' || field === 'message') {
          next[field] ??= issue.message;
        }
      }
      setErrors(next);
      return;
    }

    setErrors({});
    setIsSending(true);
    try {
      const values: ContactFormValues = parsed.data;
      await submitContactMessage({
        topic,
        name: values.name,
        contact: values.contact,
        team: values.team ?? null,
        players: values.players ?? null,
        message: values.message,
        website: values.website,
      });
      // Same event name as before the two forms merged, so the history stays
      // comparable; the topic takes the place of the old subject.
      trackContactForm(topic.value);
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {/* Honeypot: hidden from real users; bots auto-fill it. */}
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
        <div className="md:col-span-2">
          <Label htmlFor="contact-topic">What is this about?</Label>
          <Select
            value={topic.value}
            onValueChange={(value) => setTopicValue(value as ContactTopic)}
          >
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

        <LockableField
          id="contact-name"
          label="Name"
          value={name}
          onChange={setNameDraft}
          locked={nameLocked}
          maxLength={120}
          placeholder="Jane Doe"
          error={errors.name}
        />

        <LockableField
          id="contact-contact"
          label={topic.channel === 'support' ? 'Email' : 'Contact (email or phone)'}
          value={contact}
          onChange={setContactDraft}
          locked={false}
          maxLength={255}
          placeholder={
            topic.channel === 'support' ? 'you@example.com' : 'you@example.com or 717-555-1234'
          }
          error={errors.contact}
        />

        {showTeam && (
          <LockableField
            id="contact-team"
            label={topic.needsTeam ? 'Proposed team name' : 'Team name'}
            value={team}
            onChange={setTeamDraft}
            locked={teamLocked}
            maxLength={120}
            placeholder={topic.needsTeam ? 'Bag Boys' : 'Your team (optional)'}
            error={errors.team}
          />
        )}

        {topic.needsPlayers && (
          <div className="md:col-span-2">
            <Label htmlFor="contact-players">Players</Label>
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
            <p id="contact-message-error" className="mt-1 text-sm text-destructive">
              {errors.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {user && (
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
