import React from 'react';
import { X } from 'lucide-react';

interface AppModalProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

export const AppModal: React.FC<AppModalProps> = ({
  title,
  subtitle,
  children,
  onClose,
  maxWidth = 'max-w-3xl',
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-card rounded-xl w-full ${maxWidth} my-8 overflow-hidden shadow-2xl`}>
        <div className="flex justify-between items-start p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold mb-1">{title}</h2>
            {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
          </div>

          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};