/**
 * The league's one message form.
 *
 * There used to be two: this page for support, and a second form at the bottom
 * of the home page for league business — different fields, and each telling the
 * reader to use the other one (UX audit H-02). The home page carries a card
 * pointing here now, and this page asks "What is this about?" first.
 */
import { CheckCircle, Mail, MessageSquare } from 'lucide-react';
import { useState } from 'react';

import { ContactForm } from '@/components/contact/ContactForm';
import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import PageTransition from '@/components/transitions/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/useToast';

export default function Contact() {
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSent = () => {
    setIsSuccess(true);
    toast({ title: 'Message sent', description: 'The admins will get back to you.' });
  };

  const seo = (
    <SeoHead
      title="Contact | 717REC Cornhole League"
      description="Message the 717REC admins about a timeslot, a score, joining the league, your account, or anything else."
      path="/contact"
    />
  );

  if (isSuccess) {
    return (
      <PageLayout>
        {seo}
        <PageTransition>
          <div className="container max-w-2xl py-12">
            <Card>
              <CardContent className="pt-12 pb-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <CheckCircle className="size-12 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold mb-2">Message Sent!</h1>
                <p className="text-muted-foreground mb-6">
                  Thank you for contacting us. We&apos;ll get back to you within 24-48 hours.
                </p>
                <Button onClick={() => setIsSuccess(false)}>Send Another Message</Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {seo}
      <PageTransition>
        <div className="container max-w-2xl py-12">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-5" />
                Send us a message
              </CardTitle>
              <CardDescription>
                Pick what it is about and the form asks for what the league needs. Your message
                reaches the admins&apos; inbox and they are emailed about it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactForm onSent={handleSent} />
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </PageLayout>
  );
}
