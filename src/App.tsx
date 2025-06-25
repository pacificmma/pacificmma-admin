import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './routes/ProtectedRoutes';
import LoginPage from './pages/LoginPage';
import AppRoutes from './routes/AppRoutes';

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppRoutes />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
