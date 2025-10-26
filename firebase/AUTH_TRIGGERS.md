# Firebase Auth Trigger Cloud Functions

Diese Dokumentation beschreibt die automatischen Cloud Functions, die bei Firebase Auth-Ereignissen ausgelöst werden.

## Funktionen

### 1. `createUserDocument`
- **Trigger**: `functions.auth.user().onCreate()`
- **Zweck**: Erstellt automatisch einen Benutzer-Eintrag in der Firestore `users`-Kollektion
- **Auslöser**: Neuer Benutzer in Firebase Auth registriert

#### Funktionalität
- Extrahiert Benutzerinformationen aus Firebase Auth
- Parst Vor- und Nachname aus `displayName`
- Weist Standard-Rolle basierend auf E-Mail-Domain zu
- Erstellt vollständigen Benutzer-Eintrag in Firestore
- Setzt Custom Claims für rollenbasierte Zugriffskontrolle

#### Benutzer-Datenstruktur
```typescript
interface UserDocument {
  id: string;                    // Firebase Auth UID
  email: string;                 // E-Mail-Adresse
  firstName: string;             // Vorname
  lastName: string;              // Nachname
  displayName: string;           // Vollständiger Name
  photoURL: string;              // Profilbild-URL
  role: 'employee' | 'manager' | 'admin';
  hours_saldo: number;           // Stunden-Saldo (initial: 0.00)
  isActive: boolean;             // Benutzer aktiv
  createdAt: Timestamp;          // Erstellungsdatum
  updatedAt: Timestamp;          // Letzte Aktualisierung
  lastLoginAt: Timestamp;        // Letzter Login
  departmentId: string | null;   // Abteilungs-ID
  phoneNumber: string | null;    // Telefonnummer
  emailVerified: boolean;        // E-Mail verifiziert
  customClaims: object;          // Custom Claims
}
```

#### Rollen-Zuweisung
```typescript
// Standard-Rolle: 'employee'
let defaultRole = 'employee';

// Admin-Rolle für spezielle E-Mail-Domains
if (email.includes('@admin.') || email.includes('@manager.')) {
  defaultRole = 'admin';
}

// Manager-Rolle für Lead/Supervisor-Domains
else if (email.includes('@lead.') || email.includes('@supervisor.')) {
  defaultRole = 'manager';
}
```

### 2. `deleteUserDocument`
- **Trigger**: `functions.auth.user().onDelete()`
- **Zweck**: Löscht automatisch Benutzer-Eintrag und zugehörige Daten
- **Auslöser**: Benutzer aus Firebase Auth gelöscht

#### Funktionalität
- Löscht Benutzer-Dokument aus `users`-Kollektion
- Löscht alle zugehörigen `schedules`
- Löscht alle zugehörigen `timerecords`
- Verwendet Batch-Operationen für Performance

### 3. `updateUserRole`
- **Typ**: Callable Function
- **Zweck**: Aktualisiert Benutzer-Rolle (Admin/Manager only)
- **Parameter**: `{ targetUserId: string, newRole: string }`

#### Funktionalität
- Überprüft Berechtigung des aufrufenden Benutzers
- Validiert neue Rolle
- Aktualisiert Firestore-Dokument
- Setzt Custom Claims in Firebase Auth
- Protokolliert Änderungen

## Automatische Workflows

### Benutzer-Registrierung
```
1. Benutzer registriert sich in Firebase Auth
2. createUserDocument wird automatisch ausgelöst
3. Benutzer-Dokument wird in Firestore erstellt
4. Standard-Rolle wird zugewiesen
5. Custom Claims werden gesetzt
6. Benutzer kann sich in der App anmelden
```

### Benutzer-Löschung
```
1. Admin löscht Benutzer aus Firebase Auth
2. deleteUserDocument wird automatisch ausgelöst
3. Benutzer-Dokument wird aus Firestore gelöscht
4. Alle zugehörigen Daten werden entfernt
5. Benutzer ist vollständig aus dem System entfernt
```

### Rollen-Änderung
```
1. Admin/Manager ruft updateUserRole auf
2. Berechtigung wird überprüft
3. Firestore-Dokument wird aktualisiert
4. Custom Claims werden aktualisiert
5. Benutzer erhält neue Berechtigungen
```

## Sicherheit

### Firestore Rules
```javascript
// Benutzer können eigene Daten lesen/schreiben
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  // Cloud Functions können Benutzer erstellen/aktualisieren
  allow create, update: if request.auth != null && 
    request.auth.token.role in ['admin', 'manager'];
}
```

### Custom Claims
```typescript
// Rollenbasierte Zugriffskontrolle
await admin.auth().setCustomUserClaims(userId, {
  role: 'admin' | 'manager' | 'employee'
});
```

## Monitoring und Debugging

### Logs anzeigen
```bash
# Alle Auth-Trigger Logs
firebase functions:log --only createUserDocument,deleteUserDocument

# Spezifische Function
firebase functions:log --only createUserDocument
```

### Emulator Testing
```bash
# Emulator starten
firebase emulators:start

# Auth-Trigger im Emulator testen
# 1. Benutzer in Firebase Auth erstellen
# 2. Prüfen ob users-Dokument erstellt wurde
# 3. Benutzer löschen und prüfen ob Dokument entfernt wurde
```

## Fehlerbehandlung

### Häufige Fehler
1. **Permission Denied**: Firestore Rules blockieren Zugriff
2. **Invalid Role**: Ungültige Rolle zugewiesen
3. **User Not Found**: Benutzer existiert nicht in Auth
4. **Network Error**: Verbindungsprobleme

### Debugging
```typescript
// Detaillierte Logs in Cloud Function
console.log('User created:', {
  userId: user.uid,
  email: user.email,
  role: defaultRole
});
```

## Deployment

```bash
# Functions deployen
firebase deploy --only functions

# Rules deployen
firebase deploy --only firestore:rules

# Alles deployen
firebase deploy
```

## Testing

### Unit Tests
```typescript
// Test createUserDocument
const mockUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  displayName: 'Test User'
};

// Test deleteUserDocument
const mockDeletedUser = {
  uid: 'test-uid'
};
```

### Integration Tests
```typescript
// Test vollständiger Workflow
// 1. Benutzer in Auth erstellen
// 2. Prüfen ob users-Dokument erstellt wurde
// 3. Rolle ändern
// 4. Benutzer löschen
// 5. Prüfen ob alle Daten entfernt wurden
```
