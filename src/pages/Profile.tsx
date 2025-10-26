import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomNav } from '@/components/bottomnav';
import { useUserRole } from '@/hooks/useuserrole';
import { useAuth } from '@/hooks/useauth';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { User, Clock, Building2 } from 'lucide-react';

type Profile = Tables<'profiles'>;
type Department = Tables<'departments'>;

const Profile: React.FC = () => {
  const { role } = useUserRole();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        // Load user profile with department information
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            *,
            departments (
              id,
              name,
              color_code
            )
          `)
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error loading profile:', profileError);
        } else {
          setProfile(profileData);
          setDepartment(profileData?.departments as Department | null);
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6 pb-20">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Lade Profildaten...</div>
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
          <div>
            <h1 className="text-3xl font-bold">Profil</h1>
            <p className="text-muted-foreground">Ihre persönlichen Informationen</p>
          </div>
          
          {/* Personal Information Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <p className="text-muted-foreground">{profile?.email}</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Vollständiger Name:</span>
                </div>
                <p className="text-muted-foreground ml-6">
                  {profile?.first_name} {profile?.last_name}
                </p>

                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Abteilung:</span>
                </div>
                <div className="ml-6">
                  {department ? (
                    <Badge
                      className="text-white"
                      style={{ backgroundColor: department.color_code }}
                    >
                      {department.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Keine Abteilung zugewiesen</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">Rolle:</span>
                </div>
                <p className="text-muted-foreground ml-6 capitalize">
                  {(() => {
                    switch (role) {
                      case 'employee': return 'Mitarbeiter';
                      case 'manager': return 'Manager';
                      case 'admin': return 'Administrator';
                      default: return role;
                    }
                  })()}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">E-Mail:</span>
                </div>
                <p className="text-muted-foreground ml-6">{profile?.email}</p>

                <div className="flex items-center gap-2">
                  <span className="font-medium">Mitglied seit:</span>
                </div>
                <p className="text-muted-foreground ml-6">
                  {profile?.created_at ? 
                    new Date(profile.created_at).toLocaleDateString('de-DE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 
                    'Unbekannt'
                  }
                </p>
              </div>
            </div>
          </Card>

          {/* Hours Saldo Card */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold">Stunden-Saldo</h3>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {profile?.hours_saldo?.toFixed(2) || '0.00'}
                </div>
                <p className="text-muted-foreground">Stunden</p>
              </div>
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                Ihr aktueller Stunden-Saldo zeigt die verfügbaren Stunden an, 
                die Sie für Urlaub oder andere Zwecke nutzen können.
              </p>
            </div>
          </Card>

          {/* Additional Information */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Zusätzliche Informationen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profil-ID:</span>
                <span className="font-mono text-xs">{profile?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Letzte Aktualisierung:</span>
                <span>
                  {profile?.updated_at ? 
                    new Date(profile.updated_at).toLocaleDateString('de-DE') : 
                    'Unbekannt'
                  }
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <BottomNav role={role} />
    </div>
  );
};

export default Profile;
