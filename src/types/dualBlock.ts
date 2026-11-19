/**
 * Notification callback for errors and warnings
 */
export type NotificationCallback = (message: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}) => void;
