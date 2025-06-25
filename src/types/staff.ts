// src/types/staff.ts

export type StaffRole = 'admin' | 'trainer' | 'staff';

export interface StaffData {
  fullName: string;
  email: string;
  role: StaffRole;
}

export interface StaffRecord extends StaffData {
  id: string;
  createdAt: Date;
}
