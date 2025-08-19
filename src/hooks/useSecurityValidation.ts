import { useAuth } from '@/contexts/AuthContext';
import { useAdminAccess } from './useAdminAccess';
import { toast } from '@/hooks/use-toast';

export const useSecurityValidation = () => {
  const { user } = useAuth();
  const { isAdminAccessGranted } = useAdminAccess();

  const validateAuthentication = (): boolean => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to perform this action.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const validateAdminAccess = (operationType: string = 'admin operation'): boolean => {
    if (!validateAuthentication()) {
      return false;
    }

    if (!isAdminAccessGranted) {
      toast({
        title: 'Admin Access Required',
        description: `You need administrator privileges to perform this ${operationType}.`,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const validateInput = (input: string, maxLength: number, fieldName: string): boolean => {
    if (!input || input.trim().length === 0) {
      toast({
        title: 'Validation Error',
        description: `${fieldName} cannot be empty.`,
        variant: 'destructive',
      });
      return false;
    }

    if (input.length > maxLength) {
      toast({
        title: 'Validation Error',
        description: `${fieldName} cannot exceed ${maxLength} characters.`,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  return {
    validateAuthentication,
    validateAdminAccess,
    validateInput,
    isAuthenticated: !!user,
    isAdmin: isAdminAccessGranted,
  };
};