import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useauth';
import { Tables } from '@/integrations/supabase/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Schedule = Tables<'schedules'>;
type Department = Tables<'departments'>;

interface WeeklyScheduleProps {
  className?: string;
}

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({ className }) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());

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

  // Load schedules and departments
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
            departments (
              id,
              name,
              color_code
            )
          `)
          .eq('user_id', user.id)
          .gte('start_time', startOfWeek.toISOString())
          .lte('end_time', endOfWeek.toISOString())
          .order('start_time');

        if (schedulesError) {
          console.error('Error loading schedules:', schedulesError);
        } else {
          setSchedules(schedulesData || []);
        }

        // Load all departments
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

  // Get schedule for specific day and time
  const getScheduleForTimeSlot = (day: Date, timeSlot: string) => {
    const dayStart = new Date(day);
    dayStart.setHours(Number.parseInt(timeSlot.split(':')[0], 10), 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(dayEnd.getHours() + 1);

    return schedules.filter(schedule => {
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
          <h2 className="text-2xl font-bold">Wochenplan</h2>
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
          <button
            onClick={goToPreviousWeek}
            className="px-3 py-1 text-sm border rounded hover:bg-muted"
          >
            ← Vorherige
          </button>
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1 text-sm border rounded hover:bg-muted"
          >
            Diese Woche
          </button>
          <button
            onClick={goToNextWeek}
            className="px-3 py-1 text-sm border rounded hover:bg-muted"
          >
            Nächste →
          </button>
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
                      {daySchedules.map((schedule, scheduleIndex) => {
                        const department = schedule.departments as Department | null;
                        const backgroundColor = department?.color_code || '#6B7280';
                        
                        return (
                          <div
                            key={schedule.id}
                            className="absolute inset-0 p-1 text-xs"
                            style={{ 
                              backgroundColor,
                              zIndex: scheduleIndex + 1
                            }}
                          >
                            <div className="text-white font-medium truncate">
                              {schedule.title}
                            </div>
                            <div className="text-white/80 text-xs truncate">
                              {schedule.location}
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
