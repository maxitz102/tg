import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/bottomnav';
import { EmployeeDialog } from '@/components/employee-dialog';
import { EmployeeCard } from '@/components/employee-card';
import { useUserRole } from '@/hooks/useuserrole';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Search, Users } from 'lucide-react';

type Employee = Tables<'profiles'> & {
  departments?: Tables<'departments'> | null;
  user_roles?: Tables<'user_roles'> | null;
};

const UserManagement: React.FC = () => {
  const { role } = useUserRole();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Load employees
  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          departments (
            id,
            name,
            color_code
          ),
          user_roles (
            id,
            role
          )
        `)
        .order('first_name');

      if (error) {
        console.error('Error loading employees:', error);
      } else {
        setEmployees(data || []);
        setFilteredEmployees(data || []);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Filter employees based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(employee =>
        employee.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.departments?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    } else {
      setFilteredEmployees(employees);
    }
  }, [searchTerm, employees]);

  const handleEmployeeAdded = () => {
    loadEmployees();
  };

  const handleEditEmployee = (employee: Employee) => {
    // Edit functionality will be implemented in a future update
    console.log('Edit employee:', employee);
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!confirm(`Möchten Sie ${employee.first_name} ${employee.last_name} wirklich löschen?`)) {
      return;
    }

    try {
      // Delete user role first
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', employee.id);

      if (roleError) {
        throw roleError;
      }

      // Delete profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employee.id);

      if (profileError) {
        throw profileError;
      }

      // Reload employees
      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 pb-20">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Lade Mitarbeiter...</div>
          </div>
        </div>
        <BottomNav role={role} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 pb-20">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Mitarbeiterverwaltung</h1>
              <p className="text-muted-foreground">
                Verwalten Sie Mitarbeiter und deren Rollen
              </p>
            </div>
            <EmployeeDialog onEmployeeAdded={handleEmployeeAdded} />
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{employees.length}</p>
                  <p className="text-sm text-muted-foreground">Gesamt Mitarbeiter</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {employees.filter(e => e.user_roles?.role === 'employee').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Mitarbeiter</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {employees.filter(e => e.user_roles?.role === 'manager').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Manager</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <Card className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Mitarbeiter suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          {/* Employee List */}
          <div className="space-y-4">
            {filteredEmployees.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Keine Mitarbeiter gefunden' : 'Keine Mitarbeiter vorhanden'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Versuchen Sie einen anderen Suchbegriff'
                    : 'Fügen Sie den ersten Mitarbeiter hinzu'
                  }
                </p>
                {!searchTerm && (
                  <EmployeeDialog onEmployeeAdded={handleEmployeeAdded} />
                )}
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEmployees.map((employee) => (
                  <EmployeeCard
                    key={employee.id}
                    employee={employee}
                    onEdit={handleEditEmployee}
                    onDelete={handleDeleteEmployee}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav role={role} />
    </div>
  );
};

export default UserManagement;
