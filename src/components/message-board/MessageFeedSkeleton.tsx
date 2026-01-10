import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { gradients } from '@/styles/design-system';

import MessageItemSkeleton from './MessageItemSkeleton';

interface MessageFeedSkeletonProps {
  count?: number;
}

const MessageFeedSkeleton: React.FC<MessageFeedSkeletonProps> = ({ count = 5 }) => {
  return (
    <Card className={cn('mb-4 border shadow', gradients.card.subtle)}>
      <CardContent className="p-0">
        <ScrollArea className={cn('h-[calc(100vh-250px)]', 'lg:h-[calc(100vh-280px)]')}>
          <div className="space-y-2 p-3">
            {Array.from({ length: count }).map((_, index) => (
              <MessageItemSkeleton
                key={index}
                className={cn(
                  // Stagger animation delays for visual effect
                  index === 0 && 'animation-delay-0',
                  index === 1 && 'animation-delay-75',
                  index === 2 && 'animation-delay-150',
                  index === 3 && 'animation-delay-200',
                  index === 4 && 'animation-delay-300'
                )}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default MessageFeedSkeleton;
