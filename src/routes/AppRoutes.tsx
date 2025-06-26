import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import StaffPage from '../pages/StaffPage';
import ClassesPage from '../pages/ClassPage';
import MySchedulePage from '../pages/MySchedulePage';
import DashboardPage from '../pages/DashboardPage';
import MembersPage from '../pages/MembersPage';
import DiscountsPage from '../pages/DiscountsPage';

const AppRoutes = () => (
  <Routes>
    <Route element={<AdminLayout />}>
      {/* Default route - redirect to classes for all users */}
      <Route path="/" element={<Navigate to="/classes" replace />} />
      
      {/* Classes - accessible to all users */}
      <Route path="/classes" element={<ClassesPage />} />
      
      {/* My Schedule - for trainers and staff */}
      <Route path="/my-schedule" element={<MySchedulePage />} />
      
      {/* Dashboard - admin only */}
      <Route path="/dashboard" element={<DashboardPage />} />
      
      {/* Admin only routes */}
      <Route path="/members" element={<MembersPage />} />
      <Route path="/discounts" element={<DiscountsPage />} />
      <Route path="/staff" element={<StaffPage />} />
      
      {/* Catch all - redirect to classes */}
      <Route path="*" element={<Navigate to="/classes" replace />} />
    </Route>
  </Routes>
);

export default AppRoutes;