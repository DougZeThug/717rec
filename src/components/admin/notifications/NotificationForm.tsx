import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/** The expiry control and its explanation, split out to keep the form shallow. */
const ExpiryField: React.FC<{ value: string; onChange: (value: string) => void }> = ({
  value,
  onChange,
}) => (
  <div className="flex flex-col gap-1">
    <label htmlFor="notification-expires-at" className="text-sm font-medium text-foreground">
      Expires (optional)
    </label>
    <Input
      id="notification-expires-at"
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <ExpiryHint />
  </div>
);

const ExpiryHint: React.FC = () => (
  <p className="text-xs text-muted-foreground">
    Leave this empty to keep the notification until it is deleted. After this time it is tagged
    EXPIRED.
  </p>
);

const FormActions: React.FC<{
  isEditing: boolean;
  canSubmit: boolean;
  onCancel: () => void;
}> = ({ isEditing, canSubmit, onCancel }) => (
  <div className="flex gap-2">
    <Button type="submit" disabled={!canSubmit}>
      {isEditing ? 'Save changes' : 'Post notification'}
    </Button>
    {isEditing && <CancelButton onCancel={onCancel} />}
  </div>
);

const CancelButton: React.FC<{ onCancel: () => void }> = ({ onCancel }) => (
  <Button type="button" variant="ghost" onClick={onCancel}>
    Cancel
  </Button>
);

interface NotificationFormProps {
  title: string;
  body: string;
  expiresAt: string;
  isEditing: boolean;
  canSubmit: boolean;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onExpiresAtChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}

/**
 * The New / Edit notification card. Held apart from NotificationsTab so the tab
 * reads as form, list, confirm dialog rather than one deep tree.
 */
const NotificationForm: React.FC<NotificationFormProps> = ({
  title,
  body,
  expiresAt,
  isEditing,
  canSubmit,
  onTitleChange,
  onBodyChange,
  onExpiresAtChange,
  onSubmit,
  onCancel,
}) => (
  <Card className="mb-8">
    <CardHeader>
      <CardTitle>{isEditing ? 'Edit notification' : 'New notification'}</CardTitle>
    </CardHeader>
    <CardContent>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input
          placeholder="Title (max 120 chars)"
          maxLength={120}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        <Textarea
          placeholder="Message (max 1000 chars)"
          maxLength={1000}
          rows={4}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
        />
        <ExpiryField value={expiresAt} onChange={onExpiresAtChange} />
        <FormActions isEditing={isEditing} canSubmit={canSubmit} onCancel={onCancel} />
      </form>
    </CardContent>
  </Card>
);

export default NotificationForm;
