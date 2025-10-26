import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Cloud Function to calculate hours saldo for a user
 * Triggered when timerecords or schedules are modified
 */
export const calculateHoursSaldo = functions.https.onCall(async (data, context) => {
  try {
    const { userId } = data;

    if (!userId) {
      throw new functions.https.HttpsError('invalid-argument', 'userId is required');
    }

    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const db = admin.firestore();

    // Get all schedules (Soll-Zeiten) for the user
    const schedulesSnapshot = await db
      .collection('schedules')
      .where('userId', '==', userId)
      .get();

    // Get all timerecords (Ist-Zeiten) for the user
    const timerecordsSnapshot = await db
      .collection('timerecords')
      .where('userId', '==', userId)
      .where('checkOut', '!=', null) // Only completed time records
      .get();

    // Calculate total scheduled hours (Soll-Zeiten)
    let totalScheduledHours = 0;
    schedulesSnapshot.forEach(doc => {
      const schedule = doc.data();
      const startTime = schedule.startTime.toDate();
      const endTime = schedule.endTime.toDate();
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      totalScheduledHours += hours;
    });

    // Calculate total worked hours (Ist-Zeiten)
    let totalWorkedHours = 0;
    timerecordsSnapshot.forEach(doc => {
      const record = doc.data();
      if (record.totalHours) {
        totalWorkedHours += record.totalHours;
      } else if (record.checkIn && record.checkOut) {
        // Calculate hours if totalHours is not set
        const checkIn = record.checkIn.toDate();
        const checkOut = record.checkOut.toDate();
        const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        totalWorkedHours += hours;
      }
    });

    // Calculate saldo (Ist-Zeiten - Soll-Zeiten)
    const saldo = totalWorkedHours - totalScheduledHours;

    // Update the user's hours_saldo in users collection
    await db.collection('users').doc(userId).update({
      hours_saldo: Math.round(saldo * 100) / 100, // Round to 2 decimal places
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      saldo: Math.round(saldo * 100) / 100,
      totalScheduledHours: Math.round(totalScheduledHours * 100) / 100,
      totalWorkedHours: Math.round(totalWorkedHours * 100) / 100
    };

  } catch (error) {
    console.error('Error calculating hours saldo:', error);
    throw new functions.https.HttpsError('internal', 'Error calculating hours saldo');
  }
});

/**
 * Cloud Function triggered when a timerecord is created/updated/deleted
 */
export const onTimerecordChange = functions.firestore
  .document('timerecords/{recordId}')
  .onWrite(async (change, context) => {
    try {
      const recordId = context.params.recordId;
      const before = change.before.exists ? change.before.data() : null;
      const after = change.after.exists ? change.after.data() : null;

      // Determine which user to update
      let userId: string | null = null;

      if (change.after.exists && after) {
        // Document was created or updated
        userId = after.userId;
      } else if (change.before.exists && before) {
        // Document was deleted
        userId = before.userId;
      }

      if (!userId) {
        console.log('No userId found for timerecord change');
        return;
      }

      // Call the calculateHoursSaldo function
      await calculateHoursSaldo({ userId }, { auth: { uid: userId } } as any);

    } catch (error) {
      console.error('Error in onTimerecordChange:', error);
    }
  });

/**
 * Cloud Function triggered when a schedule is created/updated/deleted
 */
export const onScheduleChange = functions.firestore
  .document('schedules/{scheduleId}')
  .onWrite(async (change, context) => {
    try {
      const scheduleId = context.params.scheduleId;
      const before = change.before.exists ? change.before.data() : null;
      const after = change.after.exists ? change.after.data() : null;

      // Determine which user to update
      let userId: string | null = null;

      if (change.after.exists && after) {
        // Document was created or updated
        userId = after.userId;
      } else if (change.before.exists && before) {
        // Document was deleted
        userId = before.userId;
      }

      if (!userId) {
        console.log('No userId found for schedule change');
        return;
      }

      // Call the calculateHoursSaldo function
      await calculateHoursSaldo({ userId }, { auth: { uid: userId } } as any);

    } catch (error) {
      console.error('Error in onScheduleChange:', error);
    }
  });

/**
 * Cloud Function triggered when a new user is created in Firebase Auth
 * Automatically creates a corresponding document in the 'users' collection
 */
export const createUserDocument = functions.auth.user().onCreate(async (user) => {
  try {
    const db = admin.firestore();
    
    // Extract user information
    const userId = user.uid;
    const email = user.email || '';
    const displayName = user.displayName || '';
    const photoURL = user.photoURL || '';
    
    // Parse first and last name from displayName
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Determine default role based on email domain or other criteria
    let defaultRole = 'employee'; // Default role
    
    // You can customize role assignment logic here
    // For example, assign 'admin' role to specific email domains
    if (email.includes('@admin.') || email.includes('@manager.')) {
      defaultRole = 'admin';
    } else if (email.includes('@lead.') || email.includes('@supervisor.')) {
      defaultRole = 'manager';
    }
    
    // Create user document in Firestore
    const userData = {
      id: userId,
      email: email,
      firstName: firstName,
      lastName: lastName,
      displayName: displayName,
      photoURL: photoURL,
      role: defaultRole,
      hours_saldo: 0.00, // Initialize with zero saldo
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      // Additional fields
      departmentId: null,
      phoneNumber: user.phoneNumber || null,
      emailVerified: user.emailVerified || false,
      customClaims: user.customClaims || {}
    };
    
    // Write to Firestore
    await db.collection('users').doc(userId).set(userData);
    
    console.log(`User document created for ${email} with role: ${defaultRole}`);
    
    // Optionally, set custom claims for role-based access
    if (defaultRole !== 'employee') {
      await admin.auth().setCustomUserClaims(userId, {
        role: defaultRole
      });
    }
    
    return {
      success: true,
      userId: userId,
      role: defaultRole,
      message: `User document created successfully for ${email}`
    };
    
  } catch (error) {
    console.error('Error creating user document:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create user document');
  }
});

/**
 * Cloud Function triggered when a user is deleted from Firebase Auth
 * Automatically removes the corresponding document from the 'users' collection
 */
export const deleteUserDocument = functions.auth.user().onDelete(async (user) => {
  try {
    const db = admin.firestore();
    const userId = user.uid;
    
    // Delete user document from Firestore
    await db.collection('users').doc(userId).delete();
    
    // Also delete related data (optional - be careful with this)
    // Delete user's schedules
    const schedulesSnapshot = await db
      .collection('schedules')
      .where('userId', '==', userId)
      .get();
    
    const scheduleBatch = db.batch();
    schedulesSnapshot.docs.forEach(doc => {
      scheduleBatch.delete(doc.ref);
    });
    await scheduleBatch.commit();
    
    // Delete user's timerecords
    const timerecordsSnapshot = await db
      .collection('timerecords')
      .where('userId', '==', userId)
      .get();
    
    const timerecordsBatch = db.batch();
    timerecordsSnapshot.docs.forEach(doc => {
      timerecordsBatch.delete(doc.ref);
    });
    await timerecordsBatch.commit();
    
    console.log(`User document and related data deleted for user: ${userId}`);
    
    return {
      success: true,
      userId: userId,
      message: 'User document and related data deleted successfully'
    };
    
  } catch (error) {
    console.error('Error deleting user document:', error);
    throw new functions.https.HttpsError('internal', 'Failed to delete user document');
  }
});

/**
 * Cloud Function to update user role
 * Can be called by admins to change user roles
 */
export const updateUserRole = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { targetUserId, newRole } = data;
    
    if (!targetUserId || !newRole) {
      throw new functions.https.HttpsError('invalid-argument', 'targetUserId and newRole are required');
    }
    
    // Verify the calling user has admin role
    const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const callerData = callerDoc.data();
    
    if (!callerData || !['admin', 'manager'].includes(callerData.role)) {
      throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    }
    
    // Validate role
    const validRoles = ['employee', 'manager', 'admin'];
    if (!validRoles.includes(newRole)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
    }
    
    const db = admin.firestore();
    
    // Update user document
    await db.collection('users').doc(targetUserId).update({
      role: newRole,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update custom claims
    await admin.auth().setCustomUserClaims(targetUserId, {
      role: newRole
    });
    
    console.log(`User role updated for ${targetUserId} to ${newRole}`);
    
    return {
      success: true,
      targetUserId: targetUserId,
      newRole: newRole,
      message: 'User role updated successfully'
    };
    
  } catch (error) {
    console.error('Error updating user role:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update user role');
  }
});

/**
 * Cloud Function to export data as CSV
 * Can be called by admins to export timerecords and schedules
 */
export const exportData = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { exportType, startDate, endDate, userId } = data;

    // Verify the calling user has admin role
    const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const callerData = callerDoc.data();

    if (!callerData || callerData.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin role required');
    }

    // Validate export type
    const validExportTypes = ['timerecords', 'schedules', 'all'];
    if (!validExportTypes.includes(exportType)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid export type');
    }

    const db = admin.firestore();
    let exportData: any[] = [];

    // Parse dates
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (exportType === 'timerecords' || exportType === 'all') {
      // Export timerecords
      let timerecordsQuery = db.collection('timerecords');

      // Apply date filters
      if (start) {
        timerecordsQuery = timerecordsQuery.where('checkIn', '>=', start);
      }
      if (end) {
        timerecordsQuery = timerecordsQuery.where('checkIn', '<=', end);
      }
      if (userId) {
        timerecordsQuery = timerecordsQuery.where('userId', '==', userId);
      }

      const timerecordsSnapshot = await timerecordsQuery.get();
      const timerecords = [];

      for (const doc of timerecordsSnapshot.docs) {
        const record = doc.data();
        
        // Get user information
        const userDoc = await db.collection('users').doc(record.userId).get();
        const userData = userDoc.data();

        timerecords.push({
          id: doc.id,
          userId: record.userId,
          userFirstName: userData?.firstName || '',
          userLastName: userData?.lastName || '',
          userEmail: userData?.email || '',
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          totalHours: record.totalHours,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt
        });
      }

      exportData = [...exportData, ...timerecords];
    }

    if (exportType === 'schedules' || exportType === 'all') {
      // Export schedules
      let schedulesQuery = db.collection('schedules');

      // Apply date filters
      if (start) {
        schedulesQuery = schedulesQuery.where('startTime', '>=', start);
      }
      if (end) {
        schedulesQuery = schedulesQuery.where('startTime', '<=', end);
      }
      if (userId) {
        schedulesQuery = schedulesQuery.where('userId', '==', userId);
      }

      const schedulesSnapshot = await schedulesQuery.get();
      const schedules = [];

      for (const doc of schedulesSnapshot.docs) {
        const schedule = doc.data();
        
        // Get user information
        const userDoc = await db.collection('users').doc(schedule.userId).get();
        const userData = userDoc.data();

        // Get department information
        let departmentName = '';
        if (schedule.departmentId) {
          const deptDoc = await db.collection('departments').doc(schedule.departmentId).get();
          const deptData = deptDoc.data();
          departmentName = deptData?.name || '';
        }

        schedules.push({
          id: doc.id,
          userId: schedule.userId,
          userFirstName: userData?.firstName || '',
          userLastName: userData?.lastName || '',
          userEmail: userData?.email || '',
          title: schedule.title,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          location: schedule.location || '',
          shiftType: schedule.shiftType || '',
          departmentId: schedule.departmentId || '',
          departmentName: departmentName,
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        });
      }

      exportData = [...exportData, ...schedules];
    }

    console.log(`Data export completed: ${exportData.length} records exported`);

    return {
      success: true,
      recordCount: exportData.length,
      exportType: exportType,
      data: exportData,
      message: `Successfully exported ${exportData.length} records`
    };

  } catch (error) {
    console.error('Error in exportData:', error);
    throw new functions.https.HttpsError('internal', 'Error exporting data');
  }
});

/**
 * Manual trigger function for recalculating all user saldos
 */
export const recalculateAllSaldos = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated and has admin role
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user has admin role (implement your own role checking logic)
    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin role required');
    }

    const db = admin.firestore();
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    const results = [];
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      try {
        const result = await calculateHoursSaldo({ userId }, context);
        results.push({
          userId,
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results,
      totalProcessed: results.length
    };

  } catch (error) {
    console.error('Error in recalculateAllSaldos:', error);
    throw new functions.https.HttpsError('internal', 'Error recalculating all saldos');
  }
});
