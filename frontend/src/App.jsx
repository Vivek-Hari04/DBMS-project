import { useAuth } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages & Layouts
import DashboardLayout from './components/Layout/DashboardLayout';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';

// Job Components
import JobList from './components/Jobs/JobList';
import MyJobs from './components/Jobs/MyJobs';
import CreateJob from './components/Jobs/CreateJob';
import MyApplications from './components/Jobs/MyApplications';

// CSS
import './App.css';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-xl font-semibold text-gray-600">Loading Application...</div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <Routes>
        {/* Public Auth Routes */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} 
        />
        <Route 
          path="/register" 
          element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} 
        />

        {/* Dashboard Protected Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="jobs" element={<JobList />} />
          <Route path="my-jobs" element={<MyJobs />} />
          <Route path="create-job" element={<CreateJob />} />
          <Route path="applications" element={<MyApplications />} />
        </Route>

        {/* Root Redirect */}
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} 
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </>
  );
}

export default App;
