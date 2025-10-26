import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateUserRole } from '@/integrations/firebase/client';
import { User, Shield, Users, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  isActive: boolean;
  createdAt: any;
  lastLoginAt: any;
}

interface UserRoleManagerProps {
  users: UserData[];
  currentUserRole: string;
  onUserUpdated: () => void;
}

export const UserRoleManager: React.FC<UserRoleManagerProps> = ({ 
  users, 
  currentUserRole, 
  onUserUpdated 
}) => {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'manager':
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'manager':
        return 'Manager';
      default:
        return 'Mitarbeiter';
    }
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser || !newRole) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Benutzer und eine neue Rolle aus",
        variant: "destructive",
      });
      return;
    }

    const selectedUserData = users.find(u => u.id === selectedUser);
    if (!selectedUserData) {
      toast({
        title: "Fehler",
        description: "Benutzer nicht gefunden",
        variant: "destructive",
      });
      return;
    }

    if (selectedUserData.role === newRole) {
      toast({
        title: "Hinweis",
        description: "Der Benutzer hat bereits diese Rolle",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await updateUserRole({ 
        targetUserId: selectedUser, 
        newRole: newRole 
      });

      toast({
        title: "Rolle aktualisiert",
        description: `${selectedUserData.firstName} ${selectedUserData.lastName} wurde erfolgreich zu ${getRoleLabel(newRole)} ernannt.`,
      });

      // Reset form
      setSelectedUser('');
      setNewRole('');
      onUserUpdated();

    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Aktualisieren der Benutzerrolle",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canUpdateRole = (userRole: string) => {
    if (currentUserRole === 'admin') return true;
    if (currentUserRole === 'manager' && userRole === 'employee') return true;
    return false;
  };

  const getAvailableRoles = (currentRole: string) => {
    if (currentUserRole === 'admin') {
      return ['employee', 'manager', 'admin'];
    }
    if (currentUserRole === 'manager') {
      return ['employee', 'manager'];
    }
    return [];
  };

  const selectedUserData = users.find(u => u.id === selectedUser);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-semibold">Benutzer-Rollenverwaltung</h3>
      </div>

      <div className="space-y-6">
        {/* Role Update Form */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Benutzer auswählen</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Benutzer auswählen" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span>{user.firstName} {user.lastName}</span>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Neue Rolle</label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Rolle auswählen" />
              </SelectTrigger>
              <SelectContent>
                {selectedUserData && getAvailableRoles(selectedUserData.role).map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(role)}
                      <span>{getRoleLabel(role)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleRoleUpdate}
              disabled={loading || !selectedUser || !newRole || !selectedUserData || !canUpdateRole(selectedUserData.role)}
              className="w-full gap-2"
            >
              {loading ? 'Aktualisiere...' : 'Rolle aktualisieren'}
            </Button>
          </div>
        </div>

        {/* User List */}
        <div className="space-y-4">
          <h4 className="font-semibold">Alle Benutzer</h4>
          <div className="grid gap-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    {getRoleIcon(user.role)}
                  </div>
                  <div>
                    <div className="font-medium">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  {user.isActive ? (
                    <Badge variant="outline" className="text-green-600">
                      Aktiv
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600">
                      Inaktiv
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role Permissions Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">Rollen-Berechtigungen</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-red-600" />
              <span><strong>Administrator:</strong> Vollzugriff auf alle Funktionen</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span><strong>Manager:</strong> Mitarbeiterverwaltung und Schichtplanung</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-green-600" />
              <span><strong>Mitarbeiter:</strong> Eigene Schichten und Profil anzeigen</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
