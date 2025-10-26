import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PenTool } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type Profile = Tables<'profiles'> & {
  departments?: Tables<'departments'> | null;
};

interface TimeEntryDialogProps {
  employees: Profile[];
  onTimeEntryAdded: () => void;
}

export const TimeEntryDialog: React.FC<TimeEntryDialogProps> = ({ 
  employees, 
  onTimeEntryAdded 
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    employeeId: '',
    checkInDate: '',
    checkInTime: '',
    checkOutDate: '',
    checkOutTime: '',
    totalHours: ''
  });

  // Set default dates to today
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().slice(0, 5);
    
    setFormData(prev => ({
      ...prev,
      checkInDate: todayStr,
      checkOutDate: todayStr,
      checkInTime: timeStr,
      checkOutTime: timeStr
    }));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate total hours
      const checkInDateTime = new Date(`${formData.checkInDate}T${formData.checkInTime}`);
      const checkOutDateTime = new Date(`${formData.checkOutDate}T${formData.checkOutTime}`);
      
      if (checkOutDateTime <= checkInDateTime) {
        throw new Error('Check-out Zeit muss nach Check-in Zeit liegen');
      }

      const totalHours = (checkOutDateTime.getTime() - checkInDateTime.getTime()) / (1000 * 60 * 60);

      // Create time record
      const { error } = await supabase
        .from('timerecords')
        .insert({
          user_id: formData.employeeId,
          check_in: checkInDateTime.toISOString(),
          check_out: checkOutDateTime.toISOString(),
          total_hours: Math.round(totalHours * 100) / 100 // Round to 2 decimal places
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Zeiteintrag erstellt",
        description: "Der Zeiteintrag wurde erfolgreich hinzugefügt.",
      });

      // Reset form and close dialog
      setFormData({
        employeeId: '',
        checkInDate: '',
        checkInTime: '',
        checkOutDate: '',
        checkOutTime: '',
        totalHours: ''
      });
      setOpen(false);
      onTimeEntryAdded();

    } catch (error: any) {
      console.error('Error creating time entry:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Erstellen des Zeiteintrags",
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

  // Calculate total hours when times change
  useEffect(() => {
    if (formData.checkInDate && formData.checkInTime && formData.checkOutDate && formData.checkOutTime) {
      try {
        const checkInDateTime = new Date(`${formData.checkInDate}T${formData.checkInTime}`);
        const checkOutDateTime = new Date(`${formData.checkOutDate}T${formData.checkOutTime}`);
        
        if (checkOutDateTime > checkInDateTime) {
          const totalHours = (checkOutDateTime.getTime() - checkInDateTime.getTime()) / (1000 * 60 * 60);
          setFormData(prev => ({
            ...prev,
            totalHours: Math.round(totalHours * 100) / 100
          }));
        }
      } catch (error) {
        // Invalid date/time, ignore
      }
    }
  }, [formData.checkInDate, formData.checkInTime, formData.checkOutDate, formData.checkOutTime]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <PenTool className="w-4 h-4" />
          Zeiteintrag
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manueller Zeiteintrag</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="employee">Mitarbeiter</Label>
            <Select value={formData.employeeId} onValueChange={(value) => handleInputChange('employeeId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Mitarbeiter auswählen" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkInDate">Check-in Datum</Label>
              <Input
                id="checkInDate"
                type="date"
                value={formData.checkInDate}
                onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="checkInTime">Check-in Zeit</Label>
              <Input
                id="checkInTime"
                type="time"
                value={formData.checkInTime}
                onChange={(e) => handleInputChange('checkInTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkOutDate">Check-out Datum</Label>
              <Input
                id="checkOutDate"
                type="date"
                value={formData.checkOutDate}
                onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="checkOutTime">Check-out Zeit</Label>
              <Input
                id="checkOutTime"
                type="time"
                value={formData.checkOutTime}
                onChange={(e) => handleInputChange('checkOutTime', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="totalHours">Gesamtstunden</Label>
            <Input
              id="totalHours"
              value={formData.totalHours}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Automatisch berechnet
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || !formData.employeeId}>
              {loading ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
