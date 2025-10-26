import React from 'react';
import { WeeklySchedule } from '@/components/weekly-schedule';
import { BottomNav } from '@/components/bottomnav';
import { useUserRole } from '@/hooks/useuserrole';

const Schedule: React.FC = () => {
  const { role } = useUserRole();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 pb-20">
        <WeeklySchedule />
      </div>
      <BottomNav role={role} />
    </div>
  );
};

export default Schedule;
