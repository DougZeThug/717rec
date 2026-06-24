import { cva } from 'class-variance-authority';

export const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground',
  {
    variants: {
      variant: {
        default: 'bg-transparent dark:hover:bg-gray-800 dark:text-gray-200',
        outline:
          'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground dark:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-white dark:data-[state=on]:bg-blue-600 dark:data-[state=on]:text-white dark:data-[state=on]:border-blue-500',
      },
      size: {
        default: 'h-10 px-3',
        sm: 'h-9 px-2.5',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
