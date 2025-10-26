import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useauth';
import { Tables } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Plus, Edit, Trash2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TimeEntryDialog } from '@/components/time-entry-dialog';
import { ManualSaldoCalculator } from '@/components/manual-saldo-calculator';

type Schedule = Tables<'schedules'> & {
  profiles?: Tables<'profiles'> | null;
  departments?: Tables<'departments'> | null;
};

type Profile = Tables<'profiles'> & {
  departments?: Tables<'departments'> | null;
};

type Department = Tables<'departments'>;

interface ManagerWeeklyScheduleProps {
  className?: string;
}

export const ManagerWeeklySchedule: React.FC<ManagerWeeklyScheduleProps> = ({ className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Form data for creating/editing schedules
  const [formData, setFormData] = useState({
    employeeId: '',
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    shiftType: '',
    departmentId: ''
  });

  // Get start and end of current week
  const getWeekDates = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  };

  // Generate time slots (6 AM to 10 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  // Get day names
  const getDayNames = () => {
    const { startOfWeek } = getWeekDates(currentWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const { startOfWeek, endOfWeek } = getWeekDates(currentWeek);

        // Load schedules for the current week
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('schedules')
          .select(`
            *,
            profiles (
              id,
              first_name,
              last_name,
              email,
              departments (
                id,
                name,
                color_code
              )
            ),
            departments (
              id,
              name,
              color_code
            )
          `)
          .gte('start_time', startOfWeek.toISOString())
          .lte('end_time', endOfWeek.toISOString())
          .order('start_time');

        if (schedulesError) {
          console.error('Error loading schedules:', schedulesError);
        } else {
          setSchedules(schedulesData || []);
        }

        // Load employees
        const { data: employeesData, error: employeesError } = await supabase
          .from('profiles')
          .select(`
            *,
            departments (
              id,
              name,
              color_code
            )
          `)
          .order('first_name');

        if (employeesError) {
          console.error('Error loading employees:', employeesError);
        } else {
          setEmployees(employeesData || []);
        }

        // Load departments
        const { data: departmentsData, error: departmentsError } = await supabase
          .from('departments')
          .select('*')
          .order('name');

        if (departmentsError) {
          console.error('Error loading departments:', departmentsError);
        } else {
          setDepartments(departmentsData || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, currentWeek]);

  // Filter schedules based on selected filters
  const getFilteredSchedules = () => {
    return schedules.filter(schedule => {
      const departmentMatch = selectedDepartment === 'all' || 
        schedule.departments?.id === selectedDepartment ||
        schedule.profiles?.departments?.id === selectedDepartment;
      
      const employeeMatch = selectedEmployee === 'all' || 
        schedule.user_id === selectedEmployee;

      return departmentMatch && employeeMatch;
    });
  };

  // Get schedule for specific day and time
  const getScheduleForTimeSlot = (day: Date, timeSlot: string) => {
    const dayStart = new Date(day);
    dayStart.setHours(Number.parseInt(timeSlot.split(':')[0], 10), 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(dayEnd.getHours() + 1);

    return getFilteredSchedules().filter(schedule => {
      const scheduleStart = new Date(schedule.start_time);
      const scheduleEnd = new Date(schedule.end_time);
      
      return scheduleStart < dayEnd && scheduleEnd > dayStart;
    });
  };

  // Navigate weeks
  const goToPreviousWeek = () => {
    setCurrentWeek(prev => {
      const newWeek = new Date(prev);
      newWeek.setDate(newWeek.getDate() - 7);
      return newWeek;
    });
  };

  const goToNextWeek = () => {
    setCurrentWeek(prev => {
      const newWeek = new Date(prev);
      newWeek.setDate(newWeek.getDate() + 7);
      return newWeek;
    });
  };

  const goToCurrentWeek = () => {
    setCurrentWeek(new Date());
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { startOfWeek } = getWeekDates(currentWeek);
      const selectedDay = new Date(startOfWeek);
      selectedDay.setDate(startOfWeek.getDate() + 0); // Monday

      const startDateTime = new Date(selectedDay);
      const [startHour, startMinute] = formData.startTime.split(':');
      startDateTime.setHours(Number.parseInt(startHour, 10), Number.parseInt(startMinute, 10));

      const endDateTime = new Date(selectedDay);
      const [endHour, endMinute] = formData.endTime.split(':');
      endDateTime.setHours(Number.parseInt(endHour, 10), Number.parseInt(endMinute, 10));

      if (editingSchedule) {
        // Update existing schedule
        const { error } = await supabase
          .from('schedules')
          .update({
            title: formData.title,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            location: formData.location,
            shift_type: formData.shiftType,
            department_id: formData.departmentId || null
          })
          .eq('id', editingSchedule.id);

        if (error) throw error;

        toast({
          title: "Schicht aktualisiert",
          description: "Die Schicht wurde erfolgreich bearbeitet.",
        });
      } else {
        // Create new schedule
        const { error } = await supabase
          .from('schedules')
          .insert({
            user_id: formData.employeeId,
            title: formData.title,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            location: formData.location,
            shift_type: formData.shiftType,
            department_id: formData.departmentId || null
          });

        if (error) throw error;

        toast({
          title: "Schicht erstellt",
          description: "Die neue Schicht wurde erfolgreich erstellt.",
        });
      }

      // Reset form and close dialog
      setFormData({
        employeeId: '',
        title: '',
        startTime: '',
        endTime: '',
        location: '',
        shiftType: '',
        departmentId: ''
      });
      setShowCreateDialog(false);
      setEditingSchedule(null);

      // Reload data
      globalThis.location.reload(); // Simple reload for now

    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Speichern der Schicht",
        variant: "destructive",
      });
    }
  };

  // Handle delete schedule
  const handleDeleteSchedule = async (schedule: Schedule) => {
    if (!confirm('Möchten Sie diese Schicht wirklich löschen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', schedule.id);

      if (error) throw error;

      toast({
        title: "Schicht gelöscht",
        description: "Die Schicht wurde erfolgreich gelöscht.",
      });

      // Reload data
      globalThis.location.reload();

    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Fehler",
        description: "Fehler beim Löschen der Schicht",
        variant: "destructive",
      });
    }
  };

  // Handle edit schedule
  const handleEditSchedule = (schedule: Schedule) => {
    const startTime = new Date(schedule.start_time);
    const endTime = new Date(schedule.end_time);
    
    setFormData({
      employeeId: schedule.user_id,
      title: schedule.title,
      startTime: startTime.toTimeString().slice(0, 5),
      endTime: endTime.toTimeString().slice(0, 5),
      location: schedule.location || '',
      shiftType: schedule.shift_type || '',
      departmentId: schedule.department_id || ''
    });
    
    setEditingSchedule(schedule);
    setShowCreateDialog(true);
  };

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Lade Wochenplan...</div>
        </div>
      </Card>
    );
  }

  const timeSlots = generateTimeSlots();
  const days = getDayNames();
  const { startOfWeek, endOfWeek } = getWeekDates(currentWeek);

  return (
    <Card className={cn("p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Manager Wochenplan</h2>
          <p className="text-muted-foreground">
            {startOfWeek.toLocaleDateString('de-DE', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })} - {endOfWeek.toLocaleDateString('de-DE', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={goToPreviousWeek}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={goToCurrentWeek}
            variant="outline"
            size="sm"
          >
            <Calendar className="w-4 h-4" />
          </Button>
          <Button
            onClick={goToNextWeek}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div>
          <Label htmlFor="department-filter">Abteilung</Label>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger>
              <SelectValue placeholder="Abteilung auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Abteilungen</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="employee-filter">Mitarbeiter</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Mitarbeiter auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Mitarbeiter</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <TimeEntryDialog 
            employees={employees} 
            onTimeEntryAdded={() => {
              // Reload data when time entry is added
              globalThis.location.reload();
            }} 
          />
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex-1 gap-2"
          >
            <Plus className="w-4 h-4" />
            Neue Schicht
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="p-2 text-sm font-medium text-muted-foreground">Zeit</div>
            {days.map((day) => (
              <div key={day.toISOString()} className="p-2 text-center">
                <div className="text-sm font-medium">
                  {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {day.getDate()}.{day.getMonth() + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="space-y-1">
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="grid grid-cols-8 gap-1">
                {/* Time Label */}
                <div className="p-2 text-xs text-muted-foreground border-r">
                  {timeSlot}
                </div>

                {/* Day Columns */}
                {days.map((day) => {
                  const daySchedules = getScheduleForTimeSlot(day, timeSlot);
                  
                  return (
                    <div
                      key={day.toISOString()}
                      className="min-h-[40px] border border-border/50 relative"
                    >
                      {daySchedules.map((schedule) => {
                        const department = schedule.departments || schedule.profiles?.departments;
                        const backgroundColor = department?.color_code || '#6B7280';
                        
                        return (
                          <div
                            key={schedule.id}
                            className="absolute inset-0 p-1 text-xs group"
                            style={{ 
                              backgroundColor,
                              zIndex: 1
                            }}
                          >
                            <div className="text-white font-medium truncate">
                              {schedule.title}
                            </div>
                            <div className="text-white/80 text-xs truncate">
                              {schedule.profiles?.first_name} {schedule.profiles?.last_name}
                            </div>
                            <div className="text-white/80 text-xs">
                              {new Date(schedule.start_time).toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })} - {new Date(schedule.end_time).toLocaleTimeString('de-DE', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            
                            {/* Action buttons */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleEditSchedule(schedule)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleDeleteSchedule(schedule)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Schicht bearbeiten' : 'Neue Schicht erstellen'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="employee">Mitarbeiter</Label>
              <Select value={formData.employeeId} onValueChange={(value) => setFormData(prev => ({ ...prev, employeeId: value }))}>
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

            <div>
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Startzeit</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endTime">Endzeit</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Standort</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="shiftType">Schichttyp</Label>
              <Input
                id="shiftType"
                value={formData.shiftType}
                onChange={(e) => setFormData(prev => ({ ...prev, shiftType: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="department">Abteilung</Label>
              <Select value={formData.departmentId} onValueChange={(value) => setFormData(prev => ({ ...prev, departmentId: value }))}>
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
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Abbrechen
              </Button>
              <Button type="submit">
                {editingSchedule ? 'Aktualisieren' : 'Erstellen'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual Saldo Calculator */}
      <div className="mt-6">
        <ManualSaldoCalculator 
          employees={employees} 
          onSaldoUpdated={() => {
            // Reload data when saldo is updated
            globalThis.location.reload();
          }} 
        />
      </div>

      {/* Legend */}
      {departments.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h3 className="text-sm font-medium mb-2">Abteilungen</h3>
          <div className="flex flex-wrap gap-2">
            {departments.map((dept) => (
              <Badge
                key={dept.id}
                className="text-white"
                style={{ backgroundColor: dept.color_code }}
              >
                {dept.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
