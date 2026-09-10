import { ArrowRight, Mail } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The home page's way in to the league's one message form.
 *
 * This used to be a second, different form (UX audit H-02): league business
 * here, support on `/contact`, each telling the reader to use the other. There
 * is one form now, so the home page points at it instead of competing with it.
 *
 * The `contact-panel` id is kept: it is what the old cross-referral links and
 * any bookmark pointed at, and it still lands somewhere that leads to the form.
 */
const ContactCard: React.FC = () => (
  <section
    id="contact-panel"
    className={cn(
      'relative mt-6 overflow-hidden rounded-xl border border-border bg-card/60 px-4 py-6 md:px-8 md:py-8',
      'shadow-sm'
    )}
  >
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
      <div className="rounded-full bg-primary/10 p-3">
        <Mail className="size-6 text-primary" aria-hidden />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">
          Need something from the league?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A timeslot change, a score to fix, joining the league, a bug, or just a question — it all
          goes through one form.
        </p>
      </div>
      <Button asChild className="gap-2">
        <Link to="/contact">
          Send us a message
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </div>
  </section>
);

export default ContactCard;
