import React from 'react';

import PageTransition from '@/components/transitions/PageTransition';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AuthContainerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const AuthContainer: React.FC<AuthContainerProps> = ({
  title = 'Welcome to 717Rec',
  description = 'Login or create an account to access all features',
  children,
  footer,
}) => {
  return (
    <PageTransition>
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer && (
            <CardFooter className="flex justify-center text-sm text-muted-foreground">
              {footer}
            </CardFooter>
          )}
        </Card>
      </div>
    </PageTransition>
  );
};

export default AuthContainer;
