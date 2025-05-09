
// Import buttonVariants from shadcn button
import { Button as ShadcnButton, buttonVariants } from "@/components/ui/shadcn/button";

// Export both the Button component and the buttonVariants
export { ShadcnButton as Button, buttonVariants };

// For backward compatibility, also export Button as default
export default ShadcnButton;

// Export ButtonProps type
export type { ButtonProps } from "@/components/ui/shadcn/button";
