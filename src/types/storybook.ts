/**
 * Mocked types for Storybook to fix build errors
 * This allows us to use Storybook types without needing to install the full package
 */

import React from 'react';

// Define a proper constraint for component types
type ComponentType =
  | React.ComponentType
  | React.JSXElementConstructor<unknown>
  | keyof JSX.IntrinsicElements;

export interface Meta<T extends ComponentType> {
  title: string;
  component: T;
  parameters?: Record<string, unknown>;
}

export interface StoryObj<T extends ComponentType> {
  args: Partial<React.ComponentProps<T>>;
}
