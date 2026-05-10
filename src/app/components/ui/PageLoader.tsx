import React from 'react';

interface PageLoaderProps {
  text?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  text = 'Loading...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm">{text}</p>
    </div>
  );
};