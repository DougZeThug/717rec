import { LockIcon } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';

interface AdminAccessModalProps {
  isOpen: boolean;
  onAccessGranted?: () => void;
  onRequestAccess?: () => void;
}

export const AdminAccessModal: React.FC<AdminAccessModalProps> = ({
  isOpen,
  // onAccessGranted is available but unused
  onRequestAccess,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleRequestAccess = () => {
    if (onRequestAccess) {
      onRequestAccess();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <LockIcon className="h-5 w-5 mr-2" />
            Access Restricted
          </DialogTitle>
          <DialogDescription>
            {!user
              ? 'You must be logged in to access this area.'
              : "You don't have permission to access the admin panel."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!user ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => navigate('/auth', { state: { returnTo: '/admin' } })}
            >
              Login to Continue
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={handleRequestAccess}
              >
                Request Access
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleBackToHome}>
                Back to Home
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
