/**
 * Contact Support Page
 * Allows users to submit support requests via a form
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Mail, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import PageLayout from '@/components/layout/PageLayout';
import SeoHead from '@/components/seo/SeoHead';
import PageTransition from '@/components/transitions/PageTransition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import {
  type ContactFormData,
  contactSchema,
  submitContactRequest,
} from '@/services/support/ContactService';
import { trackContactForm } from '@/utils/analytics';

const SUBJECT_OPTIONS = [
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'account_issue', label: 'Account Issue' },
  { value: 'score_dispute', label: 'Score Dispute' },
  { value: 'general_question', label: 'General Question' },
  { value: 'other', label: 'Other' },
];

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
      website: '',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      await submitContactRequest(data);
      trackContactForm(data.subject);
      setIsSuccess(true);
      form.reset();
      toast({
        title: 'Success',
        description: 'Message sent successfully!',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <PageLayout>
        <SeoHead
          title="Contact Support | 717REC Cornhole League"
          description="Contact 717REC support for help with your account, team requests, score corrections, or general league questions."
          path="/contact"
        />
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
      <SeoHead
        title="Contact Support | 717REC Cornhole League"
        description="Contact 717REC support for help with your account, team requests, score corrections, or general league questions."
        path="/contact"
      />
      <PageTransition>
        <div className="container max-w-2xl py-12">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Contact Support</h1>
            <p className="text-muted-foreground">
              Have a question or need help? We&apos;re here for you.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-5" />
                Send us a message
              </CardTitle>
              <CardDescription>
                Fill out the form below and we&apos;ll get back to you as soon as possible. Your
                message is emailed to the league admins and appears in their admin inbox.
              </CardDescription>
              <p className="pt-2 text-sm text-muted-foreground">
                Need a timeslot change, a score fixed, or to join the league? Use the{' '}
                <a href="/#contact-panel" className="text-primary hover:underline">
                  message form at the bottom of the home page
                </a>{' '}
                instead — it asks for the details the league needs for those.
              </p>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Honeypot field - hidden from real users; bots auto-fill it */}
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute left-[-9999px] size-0 opacity-0"
                    {...form.register('website')}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" autoComplete="name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              placeholder="your@email.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a subject" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUBJECT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your issue or question..."
                            className="min-h-[150px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>Sending...</>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            You can also email us directly at{' '}
            <a href="mailto:admin@717rec.com" className="text-primary hover:underline">
              admin@717rec.com
            </a>
          </p>
        </div>
      </PageTransition>
    </PageLayout>
  );
}
