import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-background">
      <EmptyState
        icon={FileQuestion}
        title="Page Not Found"
        description="Oops! The page you're looking for doesn't exist or has been moved."
        actions={[
          {
            label: "Go Home",
            onClick: () => navigate("/"),
            icon: Home,
          },
          {
            label: "Go Back",
            onClick: () => navigate(-1),
            variant: "outline",
            icon: ArrowLeft,
          },
        ]}
      />
    </div>
  );
};

export default NotFound;
