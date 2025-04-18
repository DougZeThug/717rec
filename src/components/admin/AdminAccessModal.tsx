
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AdminAccessModalProps {
  isOpen: boolean;
  onAccessGranted: (code: string) => boolean;
}

export const AdminAccessModal: React.FC<AdminAccessModalProps> = ({ 
  isOpen, 
  onAccessGranted 
}) => {
  const [accessCode, setAccessCode] = useState('');
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isGranted = onAccessGranted(accessCode);
    
    if (!isGranted) {
      toast({
        title: "Access Denied",
        description: "Incorrect admin access code",
        variant: "destructive"
      });
      setAccessCode('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Access</DialogTitle>
          <DialogDescription>
            Please enter the admin access code to continue
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            type="password"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Enter access code"
            required
          />
          <Button type="submit" className="w-full">
            Access Admin Panel
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
