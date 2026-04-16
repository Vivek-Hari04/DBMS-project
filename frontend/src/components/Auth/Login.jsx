import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (!result.success) {
      setApiError(result.error || 'Login failed. Please try again.');
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

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        <div className="auth-redirect">
          <p>Don't have an account? <a href="/register">Sign Up</a></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
