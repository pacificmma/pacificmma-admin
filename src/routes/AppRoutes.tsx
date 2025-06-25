import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import StaffPage from '../pages/StaffPage';
import ClassesPage from '../pages/ClassPage';
// import MembersPage from '../pages/Members';
// import DiscountsPage from '../pages/Discounts';

const AppRoutes = () => (
  <Routes>
    <Route element={<AdminLayout />}>
       <Route path="/classes" element={<ClassesPage />} />
      {/*<Route path="/members" element={<MembersPage />} />
      <Route path="/discounts" element={<DiscountsPage />} /> */}
       <Route path="/staff" element={<StaffPage />} />
      <Route path="*" element={<Navigate to="/classes" replace />} />
    </Route>
  </Routes>
);

export default AppRoutes;
