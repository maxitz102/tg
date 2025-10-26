import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Mail, Building2, Clock } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'> & {
  departments?: Tables<'departments'> | null;
  user_roles?: Tables<'user_roles'> | null;
};

interface EmployeeCardProps {
  employee: Profile;
  onEdit?: (employee: Profile) => void;
  onDelete?: (employee: Profile) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ 
  employee, 
  onEdit, 
  onDelete 
}) => {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'employee': return 'Mitarbeiter';
      case 'manager': return 'Manager';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'employee': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-green-100 text-green-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {employee.first_name?.[0]}{employee.last_name?.[0]}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {employee.first_name} {employee.last_name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-3 h-3" />
                {employee.email}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Abteilung:</span>
              {employee.departments ? (
                <Badge
                  className="text-white text-xs"
                  style={{ backgroundColor: employee.departments.color_code }}
                >
                  {employee.departments.name}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">Keine Abteilung</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rolle:</span>
              <Badge className={getRoleColor(employee.user_roles?.role || 'employee')}>
                {getRoleLabel(employee.user_roles?.role || 'employee')}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Saldo: {employee.hours_saldo?.toFixed(2) || '0.00'} Stunden
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(employee)}
            >
              Bearbeiten
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(employee)}
            >
              Löschen
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
