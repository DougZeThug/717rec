
import '@testing-library/jest-dom';
import '@testing-library/react/dont-cleanup-after-each';
import { configure } from '@testing-library/react';

// Configure testing library
configure({ 
  // Use a supported configuration property
  testIdAttribute: 'data-testid' 
});

// Add any global test setup here

// This makes "screen" available in tests
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
