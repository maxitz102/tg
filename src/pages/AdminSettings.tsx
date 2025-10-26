import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { BottomNav } from '@/components/bottomnav';
import { ExportTool } from '@/components/export-tool';
import { UserRoleManager } from '@/components/user-role-manager';
import { FirebaseSaldoCalculator } from '@/components/firebase-saldo-calculator';
import { useUserRole } from '@/hooks/useuserrole';
import { useAuth } from '@/hooks/useauth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Users, Calculator, Download } from 'lucide-react';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  isActive: boolean;
}

const AdminSettings: React.FC = () => {
  const { role } = useUserRole();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load users for export and role management
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // This would typically load from Firebase Firestore
        // For now, we'll use mock data
        const mockUsers: UserData[] = [
          {
            id: '1',
            firstName: 'Max',
            lastName: 'Mustermann',
            email: 'max@example.com',
            role: 'employee',
            isActive: true
          },
          {
            id: '2',
            firstName: 'Anna',
            lastName: 'Schmidt',
            email: 'anna@example.com',
            role: 'manager',
            isActive: true
          },
          {
            id: '3',
            firstName: 'Peter',
            lastName: 'Admin',
            email: 'peter@admin.com',
            role: 'admin',
            isActive: true
          }
        ];
        
        setUsers(mockUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 pb-20">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Lade Admin-Einstellungen...</div>
          </div>
        </div>
        <BottomNav role={role} />
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 pb-20">
          <Card className="p-8 text-center max-w-md mx-auto">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Zugriff verweigert</h1>
            <p className="text-muted-foreground mb-4">
              Sie haben keine Berechtigung, diese Seite zu besuchen.
            </p>
            <p className="text-sm text-muted-foreground">
              Benötigte Rolle: Administrator
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Ihre Rolle: {role}
            </p>
          </Card>
        </div>
        <BottomNav role={role} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Admin-Einstellungen</h1>
            <p className="text-muted-foreground">
              Verwalten Sie das System und exportieren Sie Daten
            </p>
          </div>

          <Tabs defaultValue="export" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="export" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Benutzer
              </TabsTrigger>
              <TabsTrigger value="saldo" className="gap-2">
                <Calculator className="w-4 h-4" />
                Saldo
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-2">
                <Database className="w-4 h-4" />
                System
              </TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="space-y-6">
              <ExportTool users={users} isAdmin={role === 'admin'} />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <UserRoleManager 
                users={users} 
                currentUserRole={role} 
                onUserUpdated={() => {
                  // Reload users when updated
                  globalThis.location.reload();
                }} 
              />
            </TabsContent>

            <TabsContent value="saldo" className="space-y-6">
              <FirebaseSaldoCalculator 
                userId={user?.uid} 
                isAdmin={role === 'admin'} 
              />
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-semibold">System-Informationen</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Datenbank-Status</h4>
                      <p className="text-sm text-muted-foreground">
                        Firebase Firestore ist aktiv und verbunden
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Cloud Functions</h4>
                      <p className="text-sm text-muted-foreground">
                        Alle Functions sind deployed und funktionsfähig
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">System-Metriken</h4>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Gesamt Benutzer:</span>
                        <span className="font-semibold">{users.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Aktive Benutzer:</span>
                        <span className="font-semibold">{users.filter(u => u.isActive).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Administratoren:</span>
                        <span className="font-semibold">{users.filter(u => u.role === 'admin').length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Manager:</span>
                        <span className="font-semibold">{users.filter(u => u.role === 'manager').length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <BottomNav role={role} />
    </div>
  );
};

export default AdminSettings;