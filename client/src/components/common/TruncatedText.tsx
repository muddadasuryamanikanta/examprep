import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Tooltip } from './Tooltip';

interface TruncatedTextProps {
  children: ReactNode;
  lines?: number;
  className?: string;
  as?: React.ElementType;
  title?: string;
}

export function TruncatedText({ 
  children, 
  lines = 1, 
  className, 
  as: Component = 'span',
  title
}: TruncatedTextProps) {
  // We prefer the passed title, but if not provided and children is a string, use that.
  const tooltipText = title || (typeof children === 'string' ? children : undefined);
  
  // Base classes for truncation
  const truncationClass = lines === 1 ? 'truncate' : `line-clamp-${lines}`;

  const component = (
    <Component 
      className={cn(truncationClass, className)} 
    >
      {children}
    </Component>
  );

  if (tooltipText) {
    return (
      <Tooltip content={tooltipText} className={cn(lines === 1 ? "w-full block" : "", className?.includes("inline") ? "inline-block" : "block w-full")}>
        {/* We strip the className from the inner component if we are wrapping it, or handle specific cases. 
            Actually, TruncatedText is often structurally important (e.g. flex child). 
            Wrappers can break layout (flex-1).
            Ideally, the Tooltip trigger IS the component. 
            However, Tooltip wraps in a div. 
            Let's make the wrapper fit the flow. 
        */}
        <Component 
          className={cn(truncationClass, "w-full")} // Ensure inner text takes width
        >
          {children}
        </Component>
      </Tooltip>
    );
  }

  return component;
}
