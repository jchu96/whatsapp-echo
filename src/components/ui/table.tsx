// @ts-ignore
import React from "react"
import { cn } from "@/lib/utils"

interface TableProps {
  children?: React.ReactNode
  className?: string
}

interface TableHeaderProps {
  children?: React.ReactNode
  className?: string
}

interface TableBodyProps {
  children?: React.ReactNode
  className?: string
}

interface TableRowProps {
  children?: React.ReactNode
  className?: string
}

interface TableHeadProps {
  children?: React.ReactNode
  className?: string
}

interface TableCellProps {
  children?: React.ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    // @ts-ignore
    <div className="relative w-full overflow-auto">
      {/* @ts-ignore */}
      <table className={cn("w-full caption-bottom text-sm", className)}>
        {/* @ts-ignore */}
        {children}
      {/* @ts-ignore */}
      </table>
    {/* @ts-ignore */}
    </div>
  )
}

export function TableHeader({ children, className }: TableHeaderProps) {
  return (
    // @ts-ignore
    <thead className={cn("[&_tr]:border-b", className)}>
      {/* @ts-ignore */}
      {children}
    {/* @ts-ignore */}
    </thead>
  )
}

export function TableBody({ children, className }: TableBodyProps) {
  return (
    // @ts-ignore
    <tbody className={cn("[&_tr:last-child]:border-0", className)}>
      {/* @ts-ignore */}
      {children}
    {/* @ts-ignore */}
    </tbody>
  )
}

export function TableRow({ children, className }: TableRowProps) {
  return (
    // @ts-ignore
    <tr className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}>
      {/* @ts-ignore */}
      {children}
    {/* @ts-ignore */}
    </tr>
  )
}

export function TableHead({ children, className }: TableHeadProps) {
  return (
    // @ts-ignore
    <th className={cn("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className)}>
      {/* @ts-ignore */}
      {children}
    {/* @ts-ignore */}
    </th>
  )
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    // @ts-ignore
    <td className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}>
      {/* @ts-ignore */}
      {children}
    {/* @ts-ignore */}
    </td>
  )
} 