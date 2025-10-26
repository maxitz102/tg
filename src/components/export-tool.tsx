import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { exportData } from '@/integrations/firebase/client';
import { convertToCSV, downloadCSV, generateFilename, formatDateForCSV, formatHoursForCSV } from '@/lib/csv-export';
import { Download, FileText, Calendar, User, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ExportToolProps {
  users: UserData[];
  isAdmin: boolean;
}

export const ExportTool: React.FC<ExportToolProps> = ({ users, isAdmin }) => {
  const [loading, setLoading] = useState(false);
  const [exportType, setExportType] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const { toast } = useToast();

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const handleExport = async () => {
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
      const result = await exportData({
        exportType,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        userId: selectedUser !== 'all' ? selectedUser : null
      });

      const data = result.data as any;
      
      if (data.success && data.data) {
        // Generate CSV content
        let csvContent = '';
        let filename = '';

        if (exportType === 'timerecords') {
          const headers = [
            'ID',
            'Benutzer-ID',
            'Vorname',
            'Nachname',
            'E-Mail',
            'Check-in',
            'Check-out',
            'Gesamtstunden',
            'Erstellt am',
            'Aktualisiert am'
          ];

          const csvData = data.data.map((record: any) => ({
            id: record.id,
            userId: record.userId,
            userFirstName: record.userFirstName,
            userLastName: record.userLastName,
            userEmail: record.userEmail,
            checkIn: formatDateForCSV(record.checkIn),
            checkOut: formatDateForCSV(record.checkOut),
            totalHours: formatHoursForCSV(record.totalHours),
            createdAt: formatDateForCSV(record.createdAt),
            updatedAt: formatDateForCSV(record.updatedAt)
          }));

          csvContent = convertToCSV(csvData, headers);
          filename = generateFilename('timerecords');

        } else if (exportType === 'schedules') {
          const headers = [
            'ID',
            'Benutzer-ID',
            'Vorname',
            'Nachname',
            'E-Mail',
            'Titel',
            'Startzeit',
            'Endzeit',
            'Standort',
            'Schichttyp',
            'Abteilungs-ID',
            'Abteilung',
            'Erstellt am',
            'Aktualisiert am'
          ];

          const csvData = data.data.map((schedule: any) => ({
            id: schedule.id,
            userId: schedule.userId,
            userFirstName: schedule.userFirstName,
            userLastName: schedule.userLastName,
            userEmail: schedule.userEmail,
            title: schedule.title,
            startTime: formatDateForCSV(schedule.startTime),
            endTime: formatDateForCSV(schedule.endTime),
            location: schedule.location,
            shiftType: schedule.shiftType,
            departmentId: schedule.departmentId,
            departmentName: schedule.departmentName,
            createdAt: formatDateForCSV(schedule.createdAt),
            updatedAt: formatDateForCSV(schedule.updatedAt)
          }));

          csvContent = convertToCSV(csvData, headers);
          filename = generateFilename('schedules');

        } else if (exportType === 'all') {
          // Export both timerecords and schedules
          const timerecordsData = data.data.filter((item: any) => item.checkIn);
          const schedulesData = data.data.filter((item: any) => item.startTime);

          let csvContent = '';

          if (timerecordsData.length > 0) {
            const timerecordsHeaders = [
              'Typ',
              'ID',
              'Benutzer-ID',
              'Vorname',
              'Nachname',
              'E-Mail',
              'Check-in',
              'Check-out',
              'Gesamtstunden',
              'Erstellt am',
              'Aktualisiert am'
            ];

            const timerecordsCsvData = timerecordsData.map((record: any) => ({
              type: 'Zeiteintrag',
              id: record.id,
              userId: record.userId,
              userFirstName: record.userFirstName,
              userLastName: record.userLastName,
              userEmail: record.userEmail,
              checkIn: formatDateForCSV(record.checkIn),
              checkOut: formatDateForCSV(record.checkOut),
              totalHours: formatHoursForCSV(record.totalHours),
              createdAt: formatDateForCSV(record.createdAt),
              updatedAt: formatDateForCSV(record.updatedAt)
            }));

            csvContent += convertToCSV(timerecordsCsvData, timerecordsHeaders);
            csvContent += '\n\n';
          }

          if (schedulesData.length > 0) {
            const schedulesHeaders = [
              'Typ',
              'ID',
              'Benutzer-ID',
              'Vorname',
              'Nachname',
              'E-Mail',
              'Titel',
              'Startzeit',
              'Endzeit',
              'Standort',
              'Schichttyp',
              'Abteilungs-ID',
              'Abteilung',
              'Erstellt am',
              'Aktualisiert am'
            ];

            const schedulesCsvData = schedulesData.map((schedule: any) => ({
              type: 'Schicht',
              id: schedule.id,
              userId: schedule.userId,
              userFirstName: schedule.userFirstName,
              userLastName: schedule.userLastName,
              userEmail: schedule.userEmail,
              title: schedule.title,
              startTime: formatDateForCSV(schedule.startTime),
              endTime: formatDateForCSV(schedule.endTime),
              location: schedule.location,
              shiftType: schedule.shiftType,
              departmentId: schedule.departmentId,
              departmentName: schedule.departmentName,
              createdAt: formatDateForCSV(schedule.createdAt),
              updatedAt: formatDateForCSV(schedule.updatedAt)
            }));

            csvContent += convertToCSV(schedulesCsvData, schedulesHeaders);
          }

          filename = generateFilename('alle_daten');
        }

        // Download CSV file
        downloadCSV(csvContent, filename);

        toast({
          title: "Export erfolgreich",
          description: `${data.recordCount} Datensätze wurden als CSV exportiert.`,
        });

      } else {
        throw new Error('Export failed');
      }

    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export-Fehler",
        description: error.message || "Fehler beim Exportieren der Daten",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Zugriff verweigert</h3>
          <p className="text-muted-foreground">
            Sie haben keine Berechtigung, das Export-Tool zu verwenden.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Download className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-semibold">Daten-Export</h3>
      </div>

      <div className="space-y-6">
        {/* Export Type Selection */}
        <div>
          <Label htmlFor="export-type">Export-Typ</Label>
          <Select value={exportType} onValueChange={setExportType}>
            <SelectTrigger>
              <SelectValue placeholder="Export-Typ auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Alle Daten</span>
                </div>
              </SelectItem>
              <SelectItem value="timerecords">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Zeiteinträge</span>
                </div>
              </SelectItem>
              <SelectItem value="schedules">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Schichten</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* User Selection */}
        <div>
          <Label htmlFor="user-select">Benutzer</Label>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger>
              <SelectValue placeholder="Benutzer auswählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Alle Benutzer</span>
                </div>
              </SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="start-date">Startdatum</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="end-date">Enddatum</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={loading}
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Exportiere...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              CSV exportieren
            </>
          )}
        </Button>

        {/* Export Info */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">Export-Informationen</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Badge variant="outline">CSV-Format</Badge>
              <span>Kompatibel mit Excel und anderen Tabellenkalkulationen</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Deutsche Formatierung</Badge>
              <span>Daten und Zeiten im deutschen Format</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Automatischer Download</Badge>
              <span>Datei wird automatisch heruntergeladen</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
