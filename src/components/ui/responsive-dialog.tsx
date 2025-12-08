
import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveDialogCloseProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
});

export const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({
  open,
  onOpenChange,
  children,
}) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      )}
    </ResponsiveDialogContext.Provider>
  );
};

export const ResponsiveDialogContent: React.FC<ResponsiveDialogContentProps> = ({
  children,
  className,
}) => {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return (
      <DrawerContent className={cn("max-h-[90vh]", className)}>
        <div className="overflow-y-auto max-h-[80vh] px-4 pb-4">
          {children}
        </div>
      </DrawerContent>
    );
  }

  return (
    <DialogContent className={className}>
      {children}
    </DialogContent>
  );
};

export const ResponsiveDialogHeader: React.FC<ResponsiveDialogHeaderProps> = ({
  children,
  className,
}) => {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return <DrawerHeader className={className}>{children}</DrawerHeader>;
  }

  return <DialogHeader className={className}>{children}</DialogHeader>;
};

export const ResponsiveDialogTitle: React.FC<ResponsiveDialogTitleProps> = ({
  children,
  className,
}) => {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>;
  }

  return <DialogTitle className={className}>{children}</DialogTitle>;
};

export const ResponsiveDialogDescription: React.FC<ResponsiveDialogDescriptionProps> = ({
  children,
  className,
}) => {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return <DrawerDescription className={className}>{children}</DrawerDescription>;
  }

  return <DialogDescription className={className}>{children}</DialogDescription>;
};

export const ResponsiveDialogFooter: React.FC<ResponsiveDialogFooterProps> = ({
  children,
  className,
}) => {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return <DrawerFooter className={className}>{children}</DrawerFooter>;
  }

  return <DialogFooter className={className}>{children}</DialogFooter>;
};

export const ResponsiveDialogClose: React.FC<ResponsiveDialogCloseProps> = ({
  children,
  className,
  asChild,
}) => {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return (
      <DrawerClose className={className} asChild={asChild}>
        {children}
      </DrawerClose>
    );
  }

  return (
    <DialogClose className={className} asChild={asChild}>
      {children}
    </DialogClose>
  );
};
