import React from 'react';

import { RouterLink } from '@/components/navigation';

const NavBrand: React.FC = React.memo(() => {
  return (
    <RouterLink to="/" className="flex items-center space-x-2 mr-3">
      <img
        src="/lovable-uploads/faa54084-d274-43b9-9862-5544b188b4ca.png"
        alt="717Rec League Logo"
        className="h-8 w-8 object-contain"
      />
      <span className="text-xl font-bebas tracking-wider">717Rec</span>
    </RouterLink>
  );
});

NavBrand.displayName = 'NavBrand';

export default NavBrand;
