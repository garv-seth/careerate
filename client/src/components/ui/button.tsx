import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm hover:shadow-md", 
        muted: "bg-muted text-muted-foreground hover:bg-muted/80",
        // Agent-specific variants
        cara: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md border border-blue-300",
        maya: "bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow-md border border-purple-300",
        ellie: "bg-pink-500 text-white hover:bg-pink-600 shadow-sm hover:shadow-md border border-pink-300",
        sophia: "bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md border border-green-300",
        // Soft agent-specific variants
        "cara-soft": "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200",
        "maya-soft": "bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200",  
        "ellie-soft": "bg-pink-100 text-pink-700 hover:bg-pink-200 border border-pink-200",
        "sophia-soft": "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200",
        // Outlined agent variants
        "cara-outline": "bg-transparent text-blue-600 hover:bg-blue-50 border border-blue-300",
        "maya-outline": "bg-transparent text-purple-600 hover:bg-purple-50 border border-purple-300",
        "ellie-outline": "bg-transparent text-pink-600 hover:bg-pink-50 border border-pink-300",
        "sophia-outline": "bg-transparent text-green-600 hover:bg-green-50 border border-green-300",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-md",
        sm: "h-9 px-3 py-1.5 rounded-md text-xs",
        lg: "h-11 px-8 py-2.5 rounded-md text-base",
        xl: "h-12 px-10 py-3 rounded-lg text-base",
        icon: "h-10 w-10 rounded-full",
        "icon-sm": "h-8 w-8 rounded-full",
        pill: "h-10 px-6 py-2 rounded-full",
        "pill-sm": "h-9 px-5 py-1.5 rounded-full text-xs",
        "pill-lg": "h-11 px-8 py-2.5 rounded-full text-base",
      },
      animation: {
        none: "",
        glow: "relative overflow-hidden [&::after]:absolute [&::after]:inset-0 [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-white/20 [&::after]:to-transparent [&::after]:-translate-x-full hover:[&::after]:animate-shimmer",
        pulse: "animate-pulse",
        shimmer: "relative overflow-hidden [&::after]:absolute [&::after]:inset-0 [&::after]:bg-gradient-to-r [&::after]:from-transparent [&::after]:via-white/25 [&::after]:to-transparent [&::after]:-translate-x-full [&::after]:animate-shimmer",
      },
      elevation: {
        none: "",
        sm: "shadow-sm hover:shadow",
        md: "shadow hover:shadow-md",
        lg: "shadow-md hover:shadow-lg",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
      elevation: "sm",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: "left" | "right"
  // elevation is already included via VariantProps
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, animation, elevation, asChild = false, loading = false, icon, iconPosition = "left", children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // Render content with icon and loading state
    const content = (
      <>
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {icon && iconPosition === "left" && !loading && (
          <span className="mr-1">{icon}</span>
        )}
        {children}
        {icon && iconPosition === "right" && (
          <span className="ml-1">{icon}</span>
        )}
      </>
    )
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, animation, elevation, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {content}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
