// @ts-ignore
import React from "react"
import { cn } from "@/lib/utils"

interface CardProps {
  children?: React.ReactNode
  className?: string
  key?: any
}

interface CardHeaderProps {
  children?: React.ReactNode
  className?: string
}

interface CardTitleProps {
  children?: React.ReactNode
  className?: string
}

interface CardContentProps {
  children?: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    // @ts-ignore
    <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
      {/* @ts-ignore */}
      {children}
    {/* @ts-ignore */}
    </div>
  )
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    // @ts-ignore
    <div className={cn("flex flex-col space-y-1.5 p-6", className)}>
      {/* @ts-ignore */}
      {children}
    {/* @ts-ignore */}
    </div>
  )
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    // @ts-ignore
    <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)}>
      {/* @ts-ignore */}
      {children}
    {/* @ts-ignore */}
    </h3>
  )
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    // @ts-ignore
    <div className={cn("p-6 pt-0", className)}>
      {/* @ts-ignore */}
      {children}
    {/* @ts-ignore */}
    </div>
  )
} 