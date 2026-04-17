import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const { login, recover } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setIsDeleted(false);
    setLoading(true);

    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (!result.success) {
      setApiError(result.error || 'Login failed. Please try again.');
      if (result.is_deleted) {
        setIsDeleted(true);
      }
    }
  };

  const handleRecover = async () => {
    setApiError('');
    setApiSuccess('');
    setLoading(true);

    const result = await recover(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
       setApiSuccess('Account recovered successfully!');
    } else {
       setApiError(result.error || 'Recovery failed.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-icon">🔑</div>
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">Sign in to your account</p>
        </div>

        {/* API-level error banner */}
        {apiError && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">✕</span>
            {apiError}
          </div>
        )}
        
        {apiSuccess && (
          <div className="alert alert-success" role="status">
            <span className="alert-icon">✓</span>
            {apiSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="login-form">
          {/* Email */}
          <div className="field-group">
            <label htmlFor="login-email" className="field-label">
              Email <span className="required">*</span>
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              className="field-input"
              autoComplete="email"
              required
            />
          </div>

          {/* Password */}
          <div className="field-group">
            <label htmlFor="login-password" className="field-label">
              Password <span className="required">*</span>
            </label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
              className="field-input"
              autoComplete="current-password"
              required
            />
          </div>

          {isDeleted ? (
            <button type="button" onClick={handleRecover} className="submit-btn" disabled={loading} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              {loading ? (
                <span className="btn-loading"><span className="spinner" /> Recovering…</span>
              ) : 'Recover Account'}
            </button>
          ) : (
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loading"><span className="spinner" /> Signing in…</span>
              ) : 'Sign In'}
            </button>
          )}
        </form>
        <div className="auth-redirect">
          <p>Don't have an account? <a href="/register">Sign Up</a></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
