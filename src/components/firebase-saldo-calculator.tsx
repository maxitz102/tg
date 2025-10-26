import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { calculateHoursSaldo, recalculateAllSaldos } from '@/integrations/firebase/client';
import { Calculator, RefreshCw, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FirebaseSaldoCalculatorProps {
  userId?: string;
  isAdmin?: boolean;
}

export const FirebaseSaldoCalculator: React.FC<FirebaseSaldoCalculatorProps> = ({ 
  userId, 
  isAdmin = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [saldoData, setSaldoData] = useState<{
    saldo: number;
    totalScheduledHours: number;
    totalWorkedHours: number;
  } | null>(null);
  const { toast } = useToast();

  const calculateSaldo = async () => {
    if (!userId) {
      toast({
        title: "Fehler",
        description: "Benutzer-ID ist erforderlich",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await calculateHoursSaldo({ userId });
      const data = result.data as any;

      setSaldoData({
        saldo: data.saldo,
        totalScheduledHours: data.totalScheduledHours,
        totalWorkedHours: data.totalWorkedHours
      });

      toast({
        title: "Saldo berechnet",
        description: "Das Stunden-Saldo wurde erfolgreich aktualisiert.",
      });

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

  const recalculateAll = async () => {
    if (!isAdmin) {
      toast({
        title: "Fehler",
        description: "Admin-Berechtigung erforderlich",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await recalculateAllSaldos({});
      const data = result.data as any;

      toast({
        title: "Alle Salden berechnet",
        description: `${data.totalProcessed} Benutzer verarbeitet`,
      });

    } catch (error: any) {
      console.error('Error recalculating all saldos:', error);
      toast({
        title: "Fehler",
        description: error.message || "Fehler beim Neuberechnen aller Salden",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Firebase Saldo-Berechnung</h3>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={calculateSaldo}
            disabled={loading || !userId}
            className="flex-1 gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            {loading ? 'Berechne...' : 'Saldo berechnen'}
          </Button>

          {isAdmin && (
            <Button
              onClick={recalculateAll}
              disabled={loading}
              variant="outline"
              className="gap-2"
            >
              <Users className="w-4 h-4" />
              Alle berechnen
            </Button>
          )}
        </div>

        {saldoData && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Berechnungsergebnis</h4>
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

        <div className="text-xs text-muted-foreground">
          <p>Diese Funktion verwendet Firebase Cloud Functions zur automatischen Saldo-Berechnung.</p>
          <p>Das Saldo wird automatisch aktualisiert, wenn Schichten oder Zeiteinträge geändert werden.</p>
        </div>
      </div>
    </Card>
  );
};
