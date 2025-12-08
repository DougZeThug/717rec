import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border",
          success:
            "group-[.toaster]:bg-success/10 group-[.toaster]:border-success/20 group-[.toaster]:text-success",
          error:
            "group-[.toaster]:bg-destructive/10 group-[.toaster]:border-destructive/20 group-[.toaster]:text-destructive",
          warning:
            "group-[.toaster]:bg-warning/10 group-[.toaster]:border-warning/20 group-[.toaster]:text-warning",
          info:
            "group-[.toaster]:bg-info/10 group-[.toaster]:border-info/20 group-[.toaster]:text-info",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
