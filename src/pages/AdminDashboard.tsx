
import React, { useEffect } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { AdminAccessModal } from "@/components/admin/AdminAccessModal";
import AdminTabs from "@/components/admin/dashboard/AdminTabs";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const { isAdminAccessGranted, requestAdminAccess, isLoading } = useAdminAccess();
  const { user, authInitialized } = useAuth();
  const navigate = useNavigate();

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
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
            title: "Access requested",
            description: "An administrator has been notified of your request.",
          });
        }}
      />
    );
  }

  return (
    <motion.div 
      className="container mx-auto py-8 px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <AdminTabs />
    </motion.div>
  );
};

export default AdminDashboard;
