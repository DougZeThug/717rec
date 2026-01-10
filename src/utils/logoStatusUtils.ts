export type LogoStatus = 'optimized' | 'legacy' | 'missing';

export const getLogoStatus = (imageUrl: string | null | undefined): LogoStatus => {
  if (!imageUrl) return 'missing';

  // Check if it's the new optimized format (WebP in teams/teams/{id}/ path)
  if (imageUrl.includes('.webp') && imageUrl.includes('/teams/teams/')) {
    return 'optimized';
  }

  // Has an image but not optimized
  return 'legacy';
};

export const getStatusColor = (status: LogoStatus): string => {
  switch (status) {
    case 'optimized':
      return 'text-green-500';
    case 'legacy':
      return 'text-yellow-500';
    case 'missing':
      return 'text-red-500';
  }
};

export const getStatusLabel = (status: LogoStatus): string => {
  switch (status) {
    case 'optimized':
      return 'Optimized';
    case 'legacy':
      return 'Needs Update';
    case 'missing':
      return 'Missing';
  }
};

export const getStatusIcon = (status: LogoStatus): string => {
  switch (status) {
    case 'optimized':
      return '🟢';
    case 'legacy':
      return '🟡';
    case 'missing':
      return '🔴';
  }
};
