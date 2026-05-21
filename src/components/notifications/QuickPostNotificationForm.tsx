import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/useToast';
import { useCreateNotification } from '@/hooks/notifications/useNotificationMutations';

const QuickPostNotificationForm: React.FC = () => {
  const { user } = useAuth();
  const create = useCreateNotification();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    try {
      await create.mutateAsync({ title: t, body: b, createdBy: user?.id ?? null });
      setTitle('');
      setBody('');
      toast({ title: 'Notification posted' });
    } catch (err) {
      toast({
        title: 'Failed to post notification',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-md border border-border p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Post notification
      </p>
      <Input
        placeholder="Title"
        maxLength={120}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Message"
        maxLength={1000}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button type="submit" size="sm" disabled={create.isPending || !title.trim() || !body.trim()}>
        {create.isPending ? 'Posting…' : 'Post'}
      </Button>
    </form>
  );
};

export default QuickPostNotificationForm;