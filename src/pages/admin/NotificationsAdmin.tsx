import React from 'react';

import ContactInboxSection from '@/components/admin/contact/ContactInboxSection';
import NotificationsTab from '@/components/admin/notifications/NotificationsTab';

/**
 * The /admin/notifications page. The notification management itself lives in
 * NotificationsTab so the admin dashboard's sidebar can reach it too — this
 * page had no link anywhere in the app and had to be typed.
 */
const NotificationsAdmin: React.FC<{ currentTimeMs?: number }> = ({ currentTimeMs }) => (
  <div className="container mx-auto max-w-3xl px-4 py-8">
    <h1 className="mb-6 text-2xl font-bold text-foreground">Admin Notifications</h1>

    <ContactInboxSection />

    <NotificationsTab currentTimeMs={currentTimeMs} />
  </div>
);

export default NotificationsAdmin;
