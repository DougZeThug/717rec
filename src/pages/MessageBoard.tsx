import { MessageSquare } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import PageHeader from '@/components/layout/PageHeader';
import PageLayout from '@/components/layout/PageLayout';
import MessageFeed from '@/components/message-board/MessageFeed';
import MessageFilterBar from '@/components/message-board/MessageFilterBar';
import MessageInput from '@/components/message-board/MessageInput';
import SeoHead from '@/components/seo/SeoHead';
import PageTransition from '@/components/transitions/PageTransition';
import { useAuth } from '@/contexts/auth-context';
import { useMessageBoard } from '@/hooks/useMessageBoard';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/utils';
import { animations, gradients } from '@/styles/design-system';
import { getUIErrorMessage } from '@/utils/errorHandler';

/**
 * The sticky title and filter bar at the top of the board. A signed-out visitor
 * gets the title only: they cannot read posts, so search, filter and refresh
 * would do nothing for them.
 */
const MessageBoardHeader: React.FC<
  Pick<
    React.ComponentProps<typeof MessageFilterBar>,
    'filterOptions' | 'onFilterChange' | 'onRefresh' | 'isRefreshing'
  > & { showFilters: boolean }
> = ({ filterOptions, onFilterChange, onRefresh, isRefreshing, showFilters }) => (
  <div
    className={cn(
      'sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-3 pt-1',
      gradients.section.subtle
    )}
  >
    <PageHeader
      title={
        <div className="flex items-center space-x-2">
          <MessageSquare className="size-6 text-primary" />
          <span>Message Board</span>
        </div>
      }
      description="Chat with other teams and participants"
      className={cn(animations.fadeInSlideDown, 'mb-3')}
      compact
    />

    {/* Filter Bar with Refresh button */}
    {showFilters && (
      <div className={cn(animations.fadeInSlideDown)}>
        <MessageFilterBar
          filterOptions={filterOptions}
          onFilterChange={onFilterChange}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    )}
  </div>
);

/** The live region around the feed; it reads "busy" while messages load. */
const MessageFeedRegion: React.FC<React.ComponentProps<typeof MessageFeed>> = (feedProps) => (
  <div className={animations.fadeInSlideUp} aria-live="polite" aria-busy={feedProps.isLoading}>
    <MessageFeed {...feedProps} />
  </div>
);

const MessageBoard: React.FC = () => {
  const {
    messages,
    isLoading,
    error,
    postMessage,
    editMessage,
    deleteMessage,
    hasMore,
    loadingMore,
    loadMoreError,
    loadMoreMessages,
    refreshMessages,
    filterOptions,
    setFilter,
  } = useMessageBoard();
  const { user, authInitialized } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Wait for auth to settle, or a reload flashes the sign-in prompt at a
  // signed-in reader (and hides their filter bar) before the session is restored.
  const isSignedOut = authInitialized && !user;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshMessages();
      // Only members see the refresh button, so the read returned their posts.
      toast({ title: 'Messages refreshed', description: 'Latest messages have been loaded' });
    } catch (err) {
      toast({
        title: 'Refresh failed',
        description: getUIErrorMessage(err, 'Could not refresh messages'),
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshMessages]);
  return (
    <PageLayout>
      <SeoHead
        title="Message Board | 717REC Cornhole League"
        description="Talk with other 717REC teams: league night chatter, match talk, and announcements from Lancaster's cornhole community."
        path="/message-board"
      />
      <PageTransition animation="fadeInSlideDown">
        <div className="container max-w-4xl mx-auto pb-20 md:pb-24 px-4">
          <MessageBoardHeader
            filterOptions={filterOptions}
            onFilterChange={setFilter}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            showFilters={!isSignedOut}
          />

          <MessageFeedRegion
            messages={messages}
            isLoading={isLoading}
            error={error}
            onDeleteMessage={deleteMessage}
            onEditMessage={editMessage}
            hasMore={hasMore}
            onLoadMore={loadMoreMessages}
            loadingMore={loadingMore}
            loadMoreError={loadMoreError}
            isSignedOut={isSignedOut}
          />

          {/* Signed-out visitors get one sign-in prompt: the feed card above. */}
          {user && (
            <div className={cn(animations.fadeIn, 'animation-delay-300')}>
              <MessageInput onSend={postMessage} />
            </div>
          )}
        </div>
      </PageTransition>
    </PageLayout>
  );
};
export default MessageBoard;
