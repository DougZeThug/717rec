/**
 * Contact Support Page
 * Allows users to submit support requests via a form
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackContactForm } from '@/utils/analytics';

import PageLayout from '@/components/layout/PageLayout';
import PageTransition from '@/components/transitions/PageTransition';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageSquare, Send, CheckCircle } from 'lucide-react';

const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(1, 'Please select a subject'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactSchema>;

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

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('send-support-email', {
        body: data,
      });

      if (error) {
        throw new Error(error.message || 'Failed to send message');
      }

      trackContactForm(data.subject);
      setIsSuccess(true);
      form.reset();
      toast.success('Message sent successfully!');
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <PageLayout>
        <Helmet>
          <title>Contact Support | 717REC</title>
          <meta name="description" content="Contact 717REC support for help with your account, reporting issues, or general inquiries." />
        </Helmet>
        <PageTransition>
          <div className="container max-w-2xl py-12">
            <Card>
              <CardContent className="pt-12 pb-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <CheckCircle className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold mb-2">Message Sent!</h1>
                <p className="text-muted-foreground mb-6">
                  Thank you for contacting us. We'll get back to you within 24-48 hours.
                </p>
                <Button onClick={() => setIsSuccess(false)}>
                  Send Another Message
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Helmet>
        <title>Contact Support | 717REC</title>
        <meta name="description" content="Contact 717REC support for help with your account, reporting issues, or general inquiries." />
      </Helmet>
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
              Have a question or need help? We're here for you.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Send us a message
              </CardTitle>
              <CardDescription>
                Fill out the form below and we'll get back to you as soon as possible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
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
                            <Input type="email" placeholder="your@email.com" {...field} />
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
