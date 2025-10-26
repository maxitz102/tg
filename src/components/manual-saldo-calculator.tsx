import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Calculator, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Profile = Tables<'profiles'> & {
  departments?: Tables<'departments'> | null;
};

interface ManualSaldoCalculatorProps {
  employees: Profile[];
  onSaldoUpdated: () => void;
}

export const ManualSaldoCalculator: React.FC<ManualSaldoCalculatorProps> = ({ 
  employees, 
  onSaldoUpdated 
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saldoData, setSaldoData] = useState<{
    saldo: number;
    totalScheduledHours: number;
    totalWorkedHours: number;
  } | null>(null);
  const { toast } = useToast();

  const calculateSaldo = async () => {
    if (!selectedEmployee) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie einen Mitarbeiter aus",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call the database function to calculate saldo
      const { data, error } = await supabase.rpc('calculate_user_hours_saldo', {
        user_id_param: selectedEmployee
      });

      if (error) {
        throw error;
      }

      // Get detailed breakdown
      const { data: schedulesData } = await supabase
        .from('schedules')
        .select('start_time, end_time')
        .eq('user_id', selectedEmployee);

      const { data: timerecordsData } = await supabase
        .from('timerecords')
        .select('total_hours')
        .eq('user_id', selectedEmployee)
        .not('check_out', 'is', null);

      let totalScheduledHours = 0;
      if (schedulesData) {
        for (const schedule of schedulesData) {
          const startTime = new Date(schedule.start_time);
          const endTime = new Date(schedule.end_time);
          const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          totalScheduledHours += hours;
        }
      }

      let totalWorkedHours = 0;
      if (timerecordsData) {
        for (const record of timerecordsData) {
          if (record.total_hours) {
            totalWorkedHours += record.total_hours;
          }
        }
      }

      setSaldoData({
        saldo: data || 0,
        totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
        totalWorkedHours: Math.round(totalWorkedHours * 100) / 100
      });

      toast({
        title: "Saldo berechnet",
        description: "Das Stunden-Saldo wurde erfolgreich aktualisiert.",
      });

      onSaldoUpdated();

    } catch (error: any) {
      console.error('Error calculating saldo:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Berechnen des Saldos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployeeData = employees.find(emp => emp.id === selectedEmployee);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Stunden-Saldo berechnen</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="employee-select" className="text-sm font-medium mb-2 block">Mitarbeiter auswählen</label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
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

        <Button
          onClick={calculateSaldo}
          disabled={loading || !selectedEmployee}
          className="w-full gap-2"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Calculator className="w-4 h-4" />
          )}
          {loading ? 'Berechne...' : 'Saldo berechnen'}
        </Button>

        {saldoData && selectedEmployeeData && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">
              Saldo für {selectedEmployeeData.first_name} {selectedEmployeeData.last_name}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Soll-Zeiten:</span>
                <div className="font-semibold">{saldoData.totalScheduledHours} h</div>
              </div>
              <div>
                <span className="text-muted-foreground">Ist-Zeiten:</span>
                <div className="font-semibold">{saldoData.totalWorkedHours} h</div>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo:</span>
                <div className="font-semibold">
                  <Badge 
                    variant={saldoData.saldo >= 0 ? "default" : "destructive"}
                    className="text-sm"
                  >
                    {saldoData.saldo >= 0 ? '+' : ''}{saldoData.saldo} h
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
