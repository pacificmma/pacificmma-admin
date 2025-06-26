// src/utils/customerAccessControl.ts - For customer app implementation

import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust import path as needed

export interface CustomerUserData {
  type: 'member';
  role: 'customer';
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  membershipStatus?: string;
}

/**
 * Check if user has access to customer portal
 * This function should be used in the customer app
 */
export const checkCustomerAccess = async (user: User): Promise<{
  hasAccess: boolean;
  userData?: CustomerUserData;
  error?: string;
}> => {
  try {
    if (!user) {
      return {
        hasAccess: false,
        error: 'No user authenticated'
      };
    }

    console.log('Checking customer access for:', user.uid);

    // Check if user is a member/customer
    const memberProfileDoc = await getDoc(doc(db, 'memberProfiles', user.uid));
    
    if (!memberProfileDoc.exists()) {
      // User might be staff trying to access customer portal
      const staffDoc = await getDoc(doc(db, 'staff', user.uid));
      
      if (staffDoc.exists()) {
        return {
          hasAccess: false,
          error: 'Staff members should use the admin panel instead of the customer portal.'
        };
      }

      return {
        hasAccess: false,
        error: 'Account not found. Please contact the gym for assistance.'
      };
    }

    const memberData = memberProfileDoc.data();
    
    // Check if member account is active
    if (memberData.isActive === false) {
      return {
        hasAccess: false,
        error: 'Your account has been deactivated. Please contact the gym for assistance.'
      };
    }

    // Get additional member data from users collection
    const memberDoc = await getDoc(doc(db, 'users', user.uid));
    let membershipStatus = 'Unknown';
    
    if (memberDoc.exists()) {
      const fullMemberData = memberDoc.data();
      membershipStatus = fullMemberData.membership?.status || 'No Membership';
    }

    return {
      hasAccess: true,
      userData: {
        type: 'member',
        role: 'customer',
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        email: memberData.email,
        isActive: memberData.isActive,
        membershipStatus,
      }
    };

  } catch (error: any) {
    console.error('Error checking customer access:', error);
    return {
      hasAccess: false,
      error: 'An error occurred while verifying your access. Please try again.'
    };
  }
};

/**
 * Protected route component for customer app
 * Usage in customer app:
 * 
 * const CustomerProtectedRoute = ({ children }) => {
 *   const { user, loading } = useAuth();
 *   const [accessData, setAccessData] = useState(null);
 *   const [loading, setLoading] = useState(true);
 *   
 *   useEffect(() => {
 *     if (!loading && user) {
 *       checkCustomerAccess(user).then(setAccessData).finally(() => setLoading(false));
 *     }
 *   }, [user, loading]);
 *   
 *   if (loading) return <LoadingScreen />;
 *   if (!user) return <Navigate to="/login" />;
 *   if (!accessData?.hasAccess) return <AccessDeniedScreen error={accessData?.error} />;
 *   
 *   return children;
 * };
 */

/**
 * Get member data for authenticated customer
 */
export const getMemberData = async (user: User): Promise<any> => {
  try {
    const memberDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!memberDoc.exists()) {
      throw new Error('Member data not found');
    }

    return {
      id: memberDoc.id,
      ...memberDoc.data()
    };
  } catch (error) {
    console.error('Error fetching member data:', error);
    throw error;
  }
};

/**
 * Check if member has active membership
 */
export const hasActiveMembership = (memberData: any): boolean => {
  return memberData?.membership?.status === 'Active';
};

/**
 * Check if member can book classes
 */
export const canBookClasses = (memberData: any): boolean => {
  const membership = memberData?.membership;
  
  if (!membership) return false;
  
  // Active recurring members can book
  if (membership.status === 'Active' && membership.type === 'Recurring') {
    return true;
  }
  
  // Prepaid members with remaining credits can book
  if (membership.status === 'Active' && membership.type === 'Prepaid') {
    return (membership.remainingCredits || 0) > 0;
  }
  
  return false;
};

/**
 * Get member's remaining credits
 */
export const getRemainingCredits = (memberData: any): number => {
  return memberData?.membership?.remainingCredits || 0;
};

/**
 * Check if member's waiver is signed
 */
export const hasSignedWaiver = (memberData: any): boolean => {
  return memberData?.waiverSigned === true;
};

export default {
  checkCustomerAccess,
  getMemberData,
  hasActiveMembership,
  canBookClasses,
  getRemainingCredits,
  hasSignedWaiver,
};