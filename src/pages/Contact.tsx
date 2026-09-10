/**
 * The league's one message form.
 *
 * There used to be two: this page for support, and a second form at the bottom
 * of the home page for league business — different fields, and each telling the
 * reader to use the other one (UX audit H-02). The home page carries a card
 * pointing here now, and this page asks "What is this about?" first.
 */
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

import { ContactFormCard } from '@/components/contact/ContactFormCard';
import { MessageSentCard } from '@/components/contact/MessageSentCard';
import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import PageTransition from '@/components/transitions/PageTransition';
import { useToast } from '@/hooks/useToast';

/** Constant, so it is built once rather than on every render. */
const SEO = (
  <SeoHead
    title="Contact | 717REC Cornhole League"
    description="Message the 717REC admins about a timeslot, a score, joining the league, your account, or anything else."
    path="/contact"
  />
);

const PageHeading = (
  <div className="text-center mb-8">
    <div className="flex justify-center mb-4">
      <div className="p-3 bg-primary/10 rounded-full">
        <MessageSquare className="h-8 w-8 text-primary" />
      </div>
    </div>
    <h1 className="text-3xl font-bold mb-2">Contact the league</h1>
    <p className="text-muted-foreground">
      A timeslot, a score, joining the league, or anything else — it all starts here.
    </p>
  </div>
);

export default function Contact() {
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSent = () => {
    setIsSuccess(true);
    toast({ title: 'Message sent', description: 'The admins will get back to you.' });
  };

  return (
    <PageLayout>
      {SEO}
      <PageTransition>
        <div className="container max-w-2xl py-12">
          {isSuccess ? (
            <MessageSentCard onSendAnother={() => setIsSuccess(false)} />
          ) : (
            <>
              {PageHeading}
              <ContactFormCard onSent={handleSent} />
            </>
          )}
        </div>
      </PageTransition>
    </PageLayout>
  );
}
