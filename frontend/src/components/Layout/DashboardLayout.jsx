import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './DashboardLayout.css';

function DashboardLayout() {
  const { user, isAuthenticated, logout, isHandyman, isCustomer, isShopkeeper } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Define navigation based on user type
  let navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
  ];

  if (isHandyman) {
    navItems.push(
      { name: 'Browse Jobs', path: '/dashboard/jobs', icon: '🔍' },
      { name: 'My Applications', path: '/dashboard/applications', icon: '📝' }
    );
  } else if (isCustomer) {
    navItems.push(
      { name: 'My Jobs', path: '/dashboard/my-jobs', icon: '🗂️' },
      { name: 'Post a Job', path: '/dashboard/create-job', icon: '➕' }
    );
  } else if (isShopkeeper) {
    navItems.push(
      { name: 'Jobs', path: '/dashboard/jobs', icon: '🏢' },
      { name: 'Applications', path: '/dashboard/applications', icon: '📬' }
    );
  }

  navItems.push({ name: 'Profile', path: '/dashboard/profile', icon: '👤' });

  return (
    <div className="layout-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>JobBoard Pro</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="page-title">
              {navItems.find((n) => n.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="topbar-right">
            <div className="user-profile">
              <div className="avatar">{user.full_name.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <span className="user-name">{user.full_name}</span>
                <span className="user-role">
                  {user.user_type === 'customer' ? 'employer' : user.user_type}
                </span>
              </div>
            </div>
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="content-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
