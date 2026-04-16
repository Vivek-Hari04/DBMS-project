import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { jobAPI, applicationAPI } from '../services/api';
import './HomePage.css';
import { Link } from 'react-router-dom';

function HomePage() {
  const { user, isHandyman, isCustomer, isShopkeeper } = useAuth();
  
  const [stats, setStats] = useState({
    jobs: 0,
    applications: 0,
    active: 0,
  });

  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Mock stats for simplicity unless we fetch all
      if (isHandyman) {
        const res = await applicationAPI.getWorkerApplications(user.id);
        const apps = res.data.applications || [];
        setStats({
          jobs: 0,
          applications: apps.length,
          active: apps.filter((a) => a.status === 'pending').length,
        });
        setRecentItems(apps.slice(0, 3));
      } else if (isCustomer || isShopkeeper) {
        // Fetch all jobs for user
        const res = await jobAPI.getAllJobs();
        const allJobs = res.data.jobs || [];
        const myJobs = allJobs.filter(j => j.employer_id === user.id);
        
        setStats({
          jobs: myJobs.length,
          applications: 0, // In reality, we'd count total apps on these jobs
          active: myJobs.filter((j) => j.status !== 'closed').length,
        });
        setRecentItems(myJobs.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="home-dashboard">
        <div className="loading-state">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="home-dashboard">
      <div className="welcome-banner card">
        <h2>Welcome back, {user.full_name}! 👋</h2>
        <p>Here is what's happening with your account today.</p>
      </div>

      <div className="stats-grid">
        {(isCustomer || isShopkeeper) && (
          <>
            <div className="stat-card card">
              <span className="stat-label">Total Jobs Posted</span>
              <span className="stat-value">{stats.jobs}</span>
            </div>
            <div className="stat-card card">
              <span className="stat-label">Active Jobs</span>
              <span className="stat-value">{stats.active}</span>
            </div>
          </>
        )}

        {isHandyman && (
          <>
            <div className="stat-card card">
              <span className="stat-label">Total Applications</span>
              <span className="stat-value">{stats.applications}</span>
            </div>
            <div className="stat-card card">
              <span className="stat-label">Pending Applications</span>
              <span className="stat-value">{stats.active}</span>
            </div>
          </>
        )}
      </div>

      <div className="recent-activity card">
        <div className="section-header">
          <h3 className="card-title">
            {isHandyman ? 'Recent Applications' : 'Recent Jobs'}
          </h3>
          {(isCustomer || isShopkeeper) && (
            <Link to="/dashboard/my-jobs" className="btn-link">View All</Link>
          )}
          {isHandyman && (
            <Link to="/dashboard/applications" className="btn-link">View All</Link>
          )}
        </div>
        
        <div className="activity-list">
          {recentItems.length === 0 ? (
            <p className="empty-text">No recent activity found.</p>
          ) : (
            recentItems.map((item) => (
              <div key={item.id} className="activity-item">
                <div className="activity-icon">
                  {isHandyman ? '📝' : '💼'}
                </div>
                <div className="activity-details">
                  <span className="activity-title">
                    {item.title || item.job_title || `Application #${item.id}`}
                  </span>
                  <span className="activity-meta">
                    {new Date(item.created_at).toLocaleDateString()} • {item.status || 'Active'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
