import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Profile from './components/Profile/Profile';
import CreateJob from './components/Jobs/CreateJob';
import JobList from './components/Jobs/JobList';
import MyApplications from './components/Jobs/MyApplications';
import JobApplications from './components/Jobs/JobApplications';
import MyJobs from './components/Jobs/MyJobs.jsx';
import './App.css';

function App() {
  const { user, logout, isAuthenticated, isEmployer, isWorker, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [view, setView] = useState('home');
  //const [selectedJobId, setSelectedJobId] = useState(null);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="App">
      <header>
        <h1>Job Board Platform</h1>
        
        {isAuthenticated && (
          <div className="user-info">
            <span>Welcome, {user.full_name} ({user.user_type})</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        )}
      </header>

      {!isAuthenticated ? (
        <div className="auth-section">
          <div className="auth-toggle">
            <button onClick={() => setShowLogin(true)}>Login</button>
            <button onClick={() => setShowLogin(false)}>Register</button>
          </div>
          {showLogin ? <Login /> : <Register />}
        </div>
      ) : (
        <>
          <nav className="nav-buttons">
            <button onClick={() => setView('home')}>Home</button>
            <button onClick={() => setView('profile')}>My Profile</button>
            {isEmployer && (
              <>
                <button onClick={() => setView('createJob')}>Post Job</button>
                <button onClick={() => setView('myJobs')}>My Jobs</button>
              </>
            )}
            {isWorker && (
              <>
                <button onClick={() => setView('browseJobs')}>Browse Jobs</button>
                <button onClick={() => setView('myApplications')}>My Applications</button>
              </>
            )}
          </nav>

          <main>
            {view === 'home' && (
              <div className="home">
                <h2>Welcome to Job Board Platform</h2>
                {isEmployer && <p>Post jobs and manage applications from workers.</p>}
                {isWorker && <p>Browse jobs and apply to opportunities.</p>}
              </div>
            )}
            
            {view === 'profile' && <Profile userId={user.id} />}
            {view === 'createJob' && isEmployer && <CreateJob />}
            {view === 'browseJobs' && <JobList />}
            {view === 'myApplications' && isWorker && <MyApplications workerId={user.id} />}
            {view === 'myJobs' && isEmployer && <MyJobs />}
          </main>
        </>
      )}
    </div>
  );
}

export default App;
