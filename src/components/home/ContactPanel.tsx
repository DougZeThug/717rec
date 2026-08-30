import { CheckCircle2, Send } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useSubmitContactRequest } from '@/hooks/contact/useContactRequests';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import type { ContactRequestType } from '@/services/contact/ContactRequestService';

interface RequestTypeOption {
  value: ContactRequestType;
  label: string;
  helper: string;
}

const REQUEST_TYPES: RequestTypeOption[] = [
  { value: 'timeslot', label: 'Timeslot Request', helper: 'Reschedule or swap a match time.' },
  { value: 'score', label: 'Score update / correction', helper: 'Report or fix a match score.' },
  {
    value: 'join_league',
    label: 'Join the league',
    helper: 'Register a new team for an upcoming season.',
  },
  { value: 'general', label: 'General message', helper: 'Anything else you want admins to see.' },
  { value: 'other', label: 'Other', helper: '' },
];

interface RequestTypeFieldProps {
  value: ContactRequestType;
  onChange: (value: ContactRequestType) => void;
  helper?: string;
}

/** The request-type picker, with the helper line for the chosen type. */
const RequestTypeField: React.FC<RequestTypeFieldProps> = ({ value, onChange, helper }) => (
  <div className="md:col-span-2">
    <Label htmlFor="request-type">Request type</Label>
    <Select value={value} onValueChange={(v) => onChange(v as ContactRequestType)}>
      <SelectTrigger id="request-type" className="mt-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {REQUEST_TYPES.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
  </div>
);

interface LockableFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Verified from the signed-in profile: shown with a badge and read-only. */
  locked: boolean;
  maxLength: number;
  placeholder: string;
}

/**
 * A labelled text field that turns read-only, with a "Verified" badge, when the
 * value comes from the signed-in profile rather than being typed.
 */
const LockableField: React.FC<LockableFieldProps> = ({
  id,
  label,
  value,
  onChange,
  locked,
  maxLength,
  placeholder,
}) => (
  <div>
    <Label htmlFor={id} className="flex items-center gap-1.5">
      {label}
      {locked && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-3" /> Verified
        </span>
      )}
    </Label>
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={locked}
      maxLength={maxLength}
      placeholder={placeholder}
      className={cn('mt-1', locked && 'bg-muted/50')}
    />
  </div>
);

/** The static heading block, and the note saying where a message goes. */
const PanelHeader: React.FC = () => (
  <header className="mb-5 text-center">
    <h2 className="text-xl font-semibold text-foreground md:text-2xl">Send us a message</h2>
    <p className="mt-1 text-sm text-muted-foreground">
      Request a timeslot change, report a score, join the league, or just say hi.
    </p>
    <p className="mt-2 text-xs text-muted-foreground">
      Your message is emailed to the league admins and appears in their admin inbox. Got a bug, an
      account problem, or a score dispute?{' '}
      <a href="/contact" className="text-primary hover:underline">
        Use the Contact page
      </a>{' '}
      instead.
    </p>
  </header>
);

/** Owns every field and the submit. Split from the panel shell so neither tree
 *  nests deeply enough to be hard to read. */
const ContactPanelForm: React.FC = () => {
  const { user } = useAuth();
  const { activeMembership: membership } = useTeamMembership();
  const submit = useSubmitContactRequest();

  const verifiedName = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
    return meta?.full_name || meta?.name || user?.email || '';
  }, [user]);
  const verifiedTeam = membership?.team?.name ?? '';

  const [requestType, setRequestType] = useState<ContactRequestType>('general');
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [teamDraft, setTeamDraft] = useState<string | null>(null);
  const [contactDraft, setContactDraft] = useState<string | null>(null);
  const [players, setPlayers] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');

  const name = nameDraft ?? (user ? verifiedName : '');
  const team = teamDraft ?? (user ? verifiedTeam : '');
  const contact = contactDraft ?? user?.email ?? '';

  const isJoin = requestType === 'join_league';
  const nameLocked = Boolean(user) && Boolean(verifiedName) && name === verifiedName;
  const teamLocked = Boolean(user) && Boolean(verifiedTeam) && team === verifiedTeam && !isJoin; // Join the league always lets them propose a new team name

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast({
        title: 'Missing info',
        description: 'Name and message are required.',
        variant: 'destructive',
      });
      return;
    }
    if (isJoin && !team.trim()) {
      toast({
        title: 'Team name required',
        description: 'Please enter a proposed team name.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await submit.mutateAsync({
        request_type: requestType,
        submitter_name: name.trim(),
        submitter_team: team.trim() || null,
        submitter_contact: contact.trim(),
        players: isJoin ? players.trim() || null : null,
        message: message.trim(),
        website,
      });
      toast({ title: 'Message sent', description: 'Admins will reach out soon. Thanks!' });
      setMessage('');
      setPlayers('');
      if (!user) {
        setNameDraft(null);
        setTeamDraft(null);
        setContactDraft(null);
      }
      setRequestType('general');
    } catch (err) {
      toast({
        title: 'Could not send',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const activeHelper = REQUEST_TYPES.find((r) => r.value === requestType)?.helper;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <RequestTypeField value={requestType} onChange={setRequestType} helper={activeHelper} />

        <LockableField
          id="contact-name"
          label="Your name"
          value={name}
          onChange={setNameDraft}
          locked={nameLocked}
          maxLength={120}
          placeholder="Jane Doe"
        />

        <LockableField
          id="contact-team"
          label={isJoin ? 'Proposed team name' : 'Team name'}
          value={team}
          onChange={setTeamDraft}
          locked={teamLocked}
          maxLength={120}
          placeholder={isJoin ? 'Bag Boys' : 'Your team (optional)'}
        />

        <div className="md:col-span-2">
          <Label htmlFor="contact-contact">Contact (email or phone)</Label>
          <Input
            id="contact-contact"
            value={contact}
            onChange={(e) => setContactDraft(e.target.value)}
            maxLength={255}
            placeholder="you@example.com or 717-555-1234"
            className="mt-1"
          />
        </div>

        {isJoin && (
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
            rows={4}
            maxLength={2000}
            placeholder="What can we help with?"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {user && (
          <span className="text-xs text-muted-foreground">
            Signed in — submission marked verified.
          </span>
        )}
        <Button type="submit" disabled={submit.isPending} className="gap-2">
          <Send className="size-4" />
          {submit.isPending ? 'Sending…' : 'Send message'}
        </Button>
      </div>
    </form>
  );
};

const ContactPanel: React.FC = () => (
  <section
    id="contact-panel"
    className={cn(
      'relative mt-6 overflow-hidden rounded-xl border border-border bg-card/60 px-4 py-6 md:px-8 md:py-8',
      'shadow-sm'
    )}
  >
    <div className="mx-auto max-w-3xl">
      <PanelHeader />
      <ContactPanelForm />
    </div>
  </section>
);

export default ContactPanel;
