import { useEffect, useState } from 'react';

import { isNativePlatform } from '@/utils/nativeAuth';

export const useNativePlatform = () => {
  const [isNative, setIsNative] = useState<boolean>(false);

  // Check if we're on a native platform
  useEffect(() => {
    setIsNative(isNativePlatform());
  }, []);

  return { isNative };
};
