import React from 'react';
import { Card } from '@/components/ui/card';
import { BottomNav } from '@/components/bottomnav';
import { useUserRole } from '@/hooks/useuserrole';

const Dashboard: React.FC = () => {
  const { role } = useUserRole();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Willkommen zurück!</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2">Heutige Schichten</h3>
              <p className="text-muted-foreground">Keine Schichten für heute geplant</p>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2">Diese Woche</h3>
              <p className="text-muted-foreground">Übersicht Ihrer Schichten</p>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2">Stunden</h3>
              <p className="text-muted-foreground">0 Stunden diese Woche</p>
            </Card>
          </div>
        </div>
      </div>
      <BottomNav role={role} />
    </div>
  );
};

export default Dashboard;
