import React from 'react';
import { ManagerWeeklySchedule } from '@/components/manager-weekly-schedule';
import { BottomNav } from '@/components/bottomnav';
import { useUserRole } from '@/hooks/useuserrole';

const ManagerSchedule: React.FC = () => {
  const { role } = useUserRole();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 pb-20">
        <ManagerWeeklySchedule />
      </div>
      <BottomNav role={role} />
    </div>
  );
};

export default ManagerSchedule;

