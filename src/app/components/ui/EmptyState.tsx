import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <div className="text-center py-16 text-muted-foreground">
      {icon && (
        <div className="flex justify-center mb-4 opacity-40">
          {icon}
        </div>
      )}

      <p className="font-medium">{title}</p>

      {description && (
        <p className="text-sm mt-1">
          {description}
        </p>
      )}
    </div>
  );
};