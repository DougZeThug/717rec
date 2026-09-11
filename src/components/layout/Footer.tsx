import { Mail } from 'lucide-react';
import React from 'react';

import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

interface WinterProps {
  isWinterTheme: boolean;
}

/** The two footer links share one style; it was written out twice. */
const footerLinkClasses = (isWinterTheme: boolean) =>
  cn(
    'inline-flex min-h-6 items-center transition-colors font-inter font-medium',
    isWinterTheme ? 'hover:text-[hsl(var(--foreground))]' : 'hover:text-foreground'
  );

/** Explicit dimensions, so the logo reserves its space before it loads. */
const FooterLogo = () => (
  <div className="flex items-center" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
    <img
      src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png"
      alt="717 Rec Logo"
      width={40}
      height={40}
      loading="lazy"
      decoding="async"
      className="size-10"
      style={{ width: '40px', height: '40px' }}
    />
  </div>
);

const FooterContact = ({ isWinterTheme }: WinterProps) => (
  <div className="text-center md:text-left w-full md:w-auto" style={{ minHeight: '24px' }}>
    <p
      className={cn(
        'text-sm flex items-center justify-center md:justify-start gap-2 font-inter transition-colors duration-300',
        isWinterTheme ? 'text-[hsl(var(--muted-foreground))]' : 'text-muted-foreground'
      )}
    >
      <Mail
        size={16}
        className={isWinterTheme ? 'text-[hsl(var(--frost-glow))]' : 'text-muted-foreground'}
      />
      <a href="mailto:admin@717rec.com" className={footerLinkClasses(isWinterTheme)}>
        admin@717rec.com
      </a>
      <span aria-hidden="true">·</span>
      <a href="/contact" className={footerLinkClasses(isWinterTheme)}>
        Contact us
      </a>
    </p>
  </div>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { isWinterTheme } = useSeasonalTheme();

  return (
    <footer
      className={cn(
        'border-t py-4 transition-colors duration-300',
        isWinterTheme ? 'winter-card-surface border-frost-border/30' : 'bg-muted border-border'
      )}
      // minHeight still reserves the space against layout shift; the fixed
      // height clipped the taller links on a narrow phone.
      style={{ minHeight: '142px', contain: 'layout style' }}
    >
      <div className="max-w-7xl mx-auto px-4" style={{ minHeight: '110px' }}>
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ minHeight: '56px' }}
        >
          <FooterLogo />
          <FooterContact isWinterTheme={isWinterTheme} />
        </div>

        <div
          className={cn(
            'mt-3 text-center text-[0.85rem] font-inter transition-colors duration-300',
            isWinterTheme ? 'text-[hsl(var(--muted-foreground))]' : 'text-muted-foreground'
          )}
          style={{ fontSize: '0.85rem' }}
        >
          &copy; {currentYear} 717 Rec. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
