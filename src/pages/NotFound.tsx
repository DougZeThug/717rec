import { ArrowLeft, FileQuestion, Home } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { EmptyState } from '@/components/ui/empty-state';
import { routeLog } from '@/utils/logger';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    routeLog('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-background">
      <EmptyState
        icon={FileQuestion}
        title="Page Not Found"
        description="Oops! The page you're looking for doesn't exist or has been moved."
        actions={[
          {
            label: 'Go Home',
            onClick: () => navigate('/'),
            icon: Home,
          },
          {
            label: 'Go Back',
            onClick: () => navigate(-1),
            variant: 'outline',
            icon: ArrowLeft,
          },
        ]}
      />
    </div>
  );
};

export default NotFound;
