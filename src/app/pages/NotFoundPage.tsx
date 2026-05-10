import React from 'react';
import { useNavigate } from 'react-router';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-3xl font-semibold mb-2">Page Not Found</h2>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate(-1)} variant="secondary">
            <ArrowLeft className="mr-2" size={20} />
            Go Back
          </Button>
          <Button onClick={() => navigate('/dashboard')} variant="primary">
            <Home className="mr-2" size={20} />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
};
