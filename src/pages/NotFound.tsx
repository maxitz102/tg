import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground mb-6">Seite nicht gefunden</p>
        <Link to="/">
          <Button>Zurück zur Startseite</Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
