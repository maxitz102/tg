# Firebase Cloud Functions für Stunden-Saldo-Berechnung

Diese Firebase Cloud Functions implementieren die automatische Berechnung des Stunden-Saldos für Benutzer.

## Funktionen

### 1. `calculateHoursSaldo`
- **Typ**: Callable Function
- **Zweck**: Berechnet das Stunden-Saldo für einen bestimmten Benutzer
- **Parameter**: `{ userId: string }`
- **Rückgabe**: Saldo-Daten mit Soll-Zeiten, Ist-Zeiten und berechnetem Saldo

### 2. `onTimerecordChange`
- **Typ**: Firestore Trigger
- **Zweck**: Wird automatisch ausgelöst bei Änderungen in der `timerecords`-Kollektion
- **Trigger**: `timerecords/{recordId}` - onCreate, onUpdate, onDelete

### 3. `onScheduleChange`
- **Typ**: Firestore Trigger
- **Zweck**: Wird automatisch ausgelöst bei Änderungen in der `schedules`-Kollektion
- **Trigger**: `schedules/{scheduleId}` - onCreate, onUpdate, onDelete

### 4. `recalculateAllSaldos`
- **Typ**: Callable Function (Admin only)
- **Zweck**: Berechnet alle Benutzer-Salden neu
- **Berechtigung**: Nur für Admins

## Installation und Deployment

### 1. Firebase CLI installieren
```bash
npm install -g firebase-tools
```

### 2. Firebase-Projekt initialisieren
```bash
firebase login
firebase init functions
```

### 3. Dependencies installieren
```bash
cd firebase/functions
npm install
```

### 4. Functions deployen
```bash
firebase deploy --only functions
```

### 5. Firestore Rules deployen
```bash
firebase deploy --only firestore:rules
```

### 6. Firestore Indexes deployen
```bash
firebase deploy --only firestore:indexes
```

## Firestore-Schema

### users-Kollektion
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'manager' | 'admin';
  hours_saldo: number; // Automatisch berechnet
  lastUpdated: Timestamp;
}
```

### schedules-Kollektion
```typescript
interface Schedule {
  id: string;
  userId: string;
  title: string;
  startTime: Timestamp;
  endTime: Timestamp;
  location?: string;
  shiftType?: string;
  departmentId?: string;
}
```

### timerecords-Kollektion
```typescript
interface TimeRecord {
  id: string;
  userId: string;
  checkIn: Timestamp;
  checkOut?: Timestamp;
  totalHours?: number;
}
```

## Verwendung in der Anwendung

### 1. Firebase Client initialisieren
```typescript
import { calculateHoursSaldo } from '@/integrations/firebase/client';

// Saldo für einen Benutzer berechnen
const result = await calculateHoursSaldo({ userId: 'user123' });
```

### 2. React-Komponente verwenden
```tsx
import { FirebaseSaldoCalculator } from '@/components/firebase-saldo-calculator';

<FirebaseSaldoCalculator 
  userId={currentUserId} 
  isAdmin={userRole === 'admin'} 
/>
```

## Automatische Trigger

Die Cloud Functions werden automatisch ausgelöst bei:

1. **Neuer Zeiteintrag**: `timerecords` → `onTimerecordChange` → `calculateHoursSaldo`
2. **Zeiteintrag geändert**: `timerecords` → `onTimerecordChange` → `calculateHoursSaldo`
3. **Zeiteintrag gelöscht**: `timerecords` → `onTimerecordChange` → `calculateHoursSaldo`
4. **Neue Schicht**: `schedules` → `onScheduleChange` → `calculateHoursSaldo`
5. **Schicht geändert**: `schedules` → `onScheduleChange` → `calculateHoursSaldo`
6. **Schicht gelöscht**: `schedules` → `onScheduleChange` → `calculateHoursSaldo`

## Berechnungslogik

```
Saldo = Ist-Zeiten - Soll-Zeiten

Ist-Zeiten = Summe aller timerecords (mit checkOut)
Soll-Zeiten = Summe aller schedules
```

## Sicherheit

- **Authentifizierung**: Alle Functions erfordern Authentifizierung
- **Autorisierung**: Rollenbasierte Zugriffskontrolle
- **Firestore Rules**: Sichere Datenzugriffe
- **Admin-Functions**: Nur für Administratoren

## Monitoring

```bash
# Functions Logs anzeigen
firebase functions:log

# Spezifische Function überwachen
firebase functions:log --only calculateHoursSaldo
```

## Entwicklung

```bash
# Emulator starten
firebase emulators:start

# Functions im Emulator testen
firebase functions:shell
```
