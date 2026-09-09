import { m } from 'framer-motion';
import React, { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

import { AdminAccessModal } from '@/components/admin/AdminAccessModal';
import {
  DEFAULT_ADMIN_SECTION,
  isAdminSectionId,
} from '@/components/admin/dashboard/adminSections';
import AdminSidebar from '@/components/admin/dashboard/AdminSidebar';
import { useAuth } from '@/contexts/auth-context';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { toast } from '@/hooks/useToast';
import { readRememberedAdminSection, rememberAdminSection } from '@/utils/adminTabs';

const AdminDashboard = () => {
  const { isAdminAccessGranted, requestAdminAccess, isLoading } = useAdminAccess();
  const { user, authInitialized } = useAuth();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const openSection = isAdminSectionId(section) ? section : null;

  // Remember whichever section is actually on screen, so a bare /admin reopens
  // it. Recorded here rather than where a switch is requested: the switch can be
  // refused when there is unsaved work, and an address typed straight into the
  // bar never passes through a request at all.
  useEffect(() => {
    if (openSection) rememberAdminSection(openSection);
  }, [openSection]);

  // Redirect users who aren't logged in to the auth page
  useEffect(() => {
    if (authInitialized && !user) {
      navigate('/auth', { state: { returnTo: '/admin' } });
    }
  }, [user, authInitialized, navigate]);

  // Show loading state if still checking auth or admin status
  if (isLoading || !authInitialized) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  // If user is logged in but doesn't have admin access
  if (!isAdminAccessGranted) {
    return (
      <AdminAccessModal
        isOpen={true}
        onRequestAccess={() => {
          requestAdminAccess();
          toast({
            title: 'Access requested',
            description: 'An administrator has been notified of your request.',
          });
        }}
      />
    );
  }

  // The address names the section. A bare /admin reopens the last one, so the
  // user menu's "Admin Panel" link picks up where the admin left off. An id
  // that names no section — a typo, or a link from an older build — goes to the
  // default rather than the remembered section, so a bad link always lands in
  // the same predictable place.
  if (!section) {
    return <Navigate to={`/admin/${readRememberedAdminSection()}`} replace />;
  }
  if (!openSection) {
    return <Navigate to={`/admin/${DEFAULT_ADMIN_SECTION}`} replace />;
  }

  return (
    <m.div
      className="container mx-auto py-4 md:py-8 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-8">Admin Dashboard</h1>
      <AdminSidebar section={openSection} />
    </m.div>
  );
};

export default AdminDashboard;
