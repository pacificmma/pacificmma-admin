// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Staff silme fonksiyonu
exports.deleteStaff = functions.https.onCall(async (data, context) => {
  // Sadece admin kullanıcıları bu fonksiyonu çağırabilir
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    // Current user'ın admin olup olmadığını kontrol et
    const currentUserDoc = await admin.firestore()
      .collection('staff')
      .doc(context.auth.uid)
      .get();

    if (!currentUserDoc.exists || currentUserDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can delete staff');
    }

    const { staffId } = data;

    if (!staffId) {
      throw new functions.https.HttpsError('invalid-argument', 'Staff ID is required');
    }

    // 1. Firestore'dan staff kaydını sil
    await admin.firestore().collection('staff').doc(staffId).delete();

    // 2. Authentication'dan kullanıcıyı sil
    try {
      await admin.auth().deleteUser(staffId);
      console.log('Successfully deleted user from Authentication:', staffId);
    } catch (authError) {
      console.error('Error deleting user from Authentication:', authError);
      // Firestore'dan silindi ama Auth'dan silinemedi, hata fırlat
      throw new functions.https.HttpsError('internal', 'Failed to delete user from Authentication');
    }

    return { 
      success: true, 
      message: 'Staff member successfully deleted from both Firestore and Authentication' 
    };

  } catch (error) {
    console.error('Error in deleteStaff function:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'An unexpected error occurred');
  }
});

// Staff oluşturma fonksiyonu (isteğe bağlı - daha güvenli)
exports.createStaff = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    // Current user'ın admin olup olmadığını kontrol et
    const currentUserDoc = await admin.firestore()
      .collection('staff')
      .doc(context.auth.uid)
      .get();

    if (!currentUserDoc.exists || currentUserDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can create staff');
    }

    const { fullName, email, password, role } = data;

    // 1. Authentication'da kullanıcı oluştur
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
    });

    // 2. Firestore'da staff kaydı oluştur
    const staffData = {
      fullName,
      email,
      role,
      uid: userRecord.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection('staff').doc(userRecord.uid).set(staffData);

    return { 
      success: true, 
      uid: userRecord.uid,
      message: 'Staff member successfully created' 
    };

  } catch (error) {
    console.error('Error in createStaff function:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message || 'An unexpected error occurred');
  }
});

export { functions };
