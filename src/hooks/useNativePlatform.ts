import { useEffect, useState } from 'react';

import { isNativePlatform } from '@/utils/nativeAuth';

export const useNativePlatform = () => {
  const [isNative, setIsNative] = useState<boolean>(false);

  // Check if we're on a native platform
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot platform detection on mount
    setIsNative(isNativePlatform());
  }, []);

  return { isNative };
};
