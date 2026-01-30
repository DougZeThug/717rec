import { Mail } from 'lucide-react';
import React from 'react';

import { useThemeConsistency } from '@/hooks/useThemeConsistency';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { isDark } = useThemeConsistency();
  const { isWinterTheme } = useSeasonalTheme();

  return (
    <footer
      className={cn(
        'border-t py-4 transition-colors duration-300',
        isWinterTheme
          ? 'winter-card-surface border-frost-border/30'
          : 'bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-gray-800'
      )}
      style={{ minHeight: '142px', height: '142px', contain: 'strict' }}
    >
      <div
        className="max-w-7xl mx-auto px-4"
        style={{ minHeight: '110px' }}
      >
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ minHeight: '56px' }}
        >
          {/* Logo Section - explicit dimensions prevent CLS */}
          <div
            className="flex items-center"
            style={{ width: '40px', height: '40px', flexShrink: 0 }}
          >
            <img
              src="/lovable-uploads/59ad55fe-8358-4e10-8e93-3e13a6a46a58.png"
              alt="717 Rec Logo"
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              className="h-10 w-10"
              style={{ width: '40px', height: '40px' }}
            />
          </div>

          {/* Contact Section - explicit min-height */}
          <div
            className="text-center md:text-left w-full md:w-auto"
            style={{ minHeight: '24px' }}
          >
            <p
              className={cn(
                'text-sm flex items-center justify-center md:justify-start gap-2 font-inter transition-colors duration-300',
                isWinterTheme
                  ? 'text-[hsl(var(--muted-foreground))]'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <Mail
                size={16}
                className={
                  isWinterTheme
                    ? 'text-[hsl(var(--frost-glow))]'
                    : 'text-gray-600 dark:text-gray-300'
                }
              />
              <a
                href="mailto:admin@717rec.com"
                className={cn(
                  'transition-colors font-inter font-medium',
                  isWinterTheme
                    ? 'hover:text-[hsl(var(--foreground))]'
                    : 'hover:text-gray-900 dark:hover:text-white'
                )}
              >
                admin@717rec.com
              </a>
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div
          className={cn(
            'mt-3 text-center text-[0.85rem] font-inter transition-colors duration-300',
            isWinterTheme
              ? 'text-[hsl(var(--muted-foreground))]'
              : 'text-gray-600 dark:text-gray-400'
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
