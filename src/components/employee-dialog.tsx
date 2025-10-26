import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Department = Tables<'departments'>;

interface EmployeeDialogProps {
  onEmployeeAdded: () => void;
}

export const EmployeeDialog: React.FC<EmployeeDialogProps> = ({ onEmployeeAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'employee' as 'employee' | 'manager' | 'admin',
    departmentId: ''
  });

  // Load departments
  useEffect(() => {
    const loadDepartments = async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading departments:', error);
      } else {
        setDepartments(data || []);
      }
    };

    loadDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          first_name: formData.firstName,
          last_name: formData.lastName
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User creation failed');
      }

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          department_id: formData.departmentId || null,
          hours_saldo: 0.00
        });

      if (profileError) {
        throw profileError;
      }

      // Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: formData.role
        });

      if (roleError) {
        throw roleError;
      }

      toast({
        title: "Mitarbeiter erstellt",
        description: `${formData.firstName} ${formData.lastName} wurde erfolgreich hinzugefügt.`,
      });

      // Reset form and close dialog
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'employee',
        departmentId: ''
      });
      setOpen(false);
      onEmployeeAdded();

    } catch (error: any) {
      console.error('Error creating employee:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen des Mitarbeiters",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Neuer Mitarbeiter
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Mitarbeiter hinzufügen</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Vorname</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nachname</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <Label htmlFor="role">Rolle</Label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Rolle auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Mitarbeiter</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="department">Abteilung</Label>
            <Select value={formData.departmentId} onValueChange={(value) => handleInputChange('departmentId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Abteilung auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Keine Abteilung</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
