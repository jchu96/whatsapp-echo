import { getShortVersion } from "@/lib/version";

interface VersionBadgeProps {
  className?: string;
}

export const VersionBadge = ({ 
  className = "ml-2 px-2 py-1 bg-indigo-100 text-indigo-600 text-xs font-medium rounded-full" 
}: VersionBadgeProps) => {
  return (
    <span className={className}>
      {getShortVersion()}
    </span>
  );
}; 