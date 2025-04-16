
import React from "react";
import AdminTabs from "@/components/admin/dashboard/AdminTabs";

const AdminDashboard = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      <AdminTabs />
    </div>
  );
};

export default AdminDashboard;
