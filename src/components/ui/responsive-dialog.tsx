import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Phone drawer only: false stops a swipe-down from closing it. Pair it with
   * a guard in `onOpenChange`, which covers Esc and overlay clicks on desktop.
   */
  dismissible?: boolean;
  children: React.ReactNode;
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

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
});

/** Modal root that opens as a bottom drawer on mobile and a centered dialog on desktop. */
export const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({
  open,
  onOpenChange,
  dismissible = true,
  children,
}) => {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
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

/** Body area: a scrollable drawer panel on mobile, standard dialog content on desktop. */
export const ResponsiveDialogContent: React.FC<ResponsiveDialogContentProps> = ({
  children,
  className,
}) => {
  const { isMobile } = React.useContext(ResponsiveDialogContext);

  if (isMobile) {
    return (
      <DrawerContent
        // `sm:max-w-none` comes last so a desktop width cap such as `sm:max-w-md`
        // cannot shrink the sheet in the 640-767px band, where `sm:` is on but
        // this drawer is still used. It would also pull the sheet to the left.
        className={cn(
          'max-h-[90vh] supports-[height:90dvh]:max-h-[90dvh]',
          className,
          'sm:max-w-none'
        )}
      >
        <div className="overflow-y-auto max-h-[80vh] supports-[height:80dvh]:max-h-[80dvh] px-4 pb-4">
          {children}
        </div>
      </DrawerContent>
    );
  }

  return <DialogContent className={className}>{children}</DialogContent>;
};

/** Header that renders as DrawerHeader on mobile and DialogHeader on desktop. */
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

/** Title that renders as DrawerTitle on mobile and DialogTitle on desktop. */
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

/** Description text that renders in drawer style on mobile and dialog style on desktop. */
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

/** Footer that renders as DrawerFooter on mobile and DialogFooter on desktop. */
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
