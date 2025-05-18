
/**
 * Mocked types for Storybook to fix build errors
 * This allows us to use Storybook types without needing to install the full package
 */

export interface Meta<T> {
  title: string;
  component: T;
  parameters?: Record<string, unknown>;
}

export interface StoryObj<T> {
  args: Partial<React.ComponentProps<T>>;
}
