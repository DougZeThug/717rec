
import React from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { AdminAccessModal } from "@/components/admin/AdminAccessModal";
import AdminTabs from "@/components/admin/dashboard/AdminTabs";
import { motion } from "framer-motion";

const AdminDashboard = () => {
  const { isAdminAccessGranted, checkAdminAccess } = useAdminAccess();

  if (!isAdminAccessGranted) {
    return (
      <AdminAccessModal 
        isOpen={true} 
        onAccessGranted={checkAdminAccess}
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
