import { useState, useEffect, useRef } from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationAPI, shopAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './DashboardLayout.css';

function DashboardLayout() {
  const { user, isAuthenticated, logout, isHandyman, isCustomer, isShopkeeper, activeShop, setActiveShop } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [myShops, setMyShops] = useState([]);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isShopkeeper) {
      shopAPI.getMyShops().then(res => {
        const shops = res.data.shops || [];
        setMyShops(shops);
        // Auto-select first shop if none selected or selected no longer exists
        if (shops.length > 0 && (!activeShop || !shops.find(s => s.id === activeShop.id))) {
          setActiveShop(shops[0]);
        }
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShopkeeper]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getNotifications();
      setNotifications(res.data.notifications || []);
    } catch (error) {
      console.error('Failed to load notifications', error);
    }
  };

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return;
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      toast.error('Failed to mark read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (unreadCount > 0) {
        await notificationAPI.markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await notificationAPI.clearAllNotifications();
      setNotifications([]);
      toast.success('All sorted');
      setShowDropdown(false);
    } catch (err) {
      toast.error('Failed to clear notifications');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
  } else if (isCustomer || isShopkeeper) {
    navItems.push(
      { name: 'My Jobs', path: '/dashboard/my-jobs', icon: '🗂️' },
      { name: 'Browse Workers', path: '/dashboard/workers', icon: '🧑‍🔧' },
      { name: 'Post a Job', path: '/dashboard/create-job', icon: '➕' }
    );
    if (isShopkeeper) {
      navItems.push({ name: 'My Shops', path: '/dashboard/my-shops', icon: '🏪' });
    }
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
            
            {/* Notifications Dropdown */}
            <div className="notifications-wrapper" ref={dropdownRef}>
              <button 
                className="notification-bell-btn"
                onClick={() => {
                  const nextShow = !showDropdown;
                  setShowDropdown(nextShow);
                  if (nextShow && unreadCount > 0) {
                    handleMarkAllAsRead();
                  }
                }}
              >
                <Bell size={24} />
                {unreadCount > 0 && (
                  <span className="notification-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h3>Notifications</h3>
                    {notifications.length > 0 && (
                      <button 
                        onClick={handleClearAll}
                        className="mark-all-read"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  
                  <div className="notifications-body">
                    {notifications.length === 0 ? (
                      <div className="notification-empty">
                        <Bell size={32} opacity={0.5} />
                        No notifications yet
                      </div>
                    ) : (
                      <div className="notifications-list">
                        {notifications.map(notification => (
                          <div 
                            key={notification.id} 
                            onClick={() => handleMarkAsRead(notification.id, notification.is_read)}
                            className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                          >
                            <div className="notif-title-row">
                              <h4 className="notif-title">
                                {notification.title}
                              </h4>
                              {!notification.is_read && (
                                <span className="unread-dot"></span>
                              )}
                            </div>
                            <p className="notif-message">
                              {notification.message}
                            </p>
                            <div className="notif-time">
                              {new Date(notification.created_at).toLocaleString(undefined, { 
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="user-profile">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="avatar"
                  className="avatar"
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    // fallback to initial if the URL is broken
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="avatar">{user.full_name.charAt(0).toUpperCase()}</div>
              )}
              <div className="user-info">
                <span className="user-name">{user.full_name}</span>
                <span className="user-role">
                  {user.user_type === 'customer' ? 'employer' : (user.user_type === 'handyman' ? 'worker' : user.user_type)}
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
