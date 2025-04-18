
import React from "react";
import { Navigate } from "react-router-dom";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { AdminAccessModal } from "@/components/admin/AdminAccessModal";
import AdminTabs from "@/components/admin/dashboard/AdminTabs";

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
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <AdminTabs />
    </div>
  );
};

export default AdminDashboard;
