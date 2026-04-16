import { useState } from 'react';
import { authAPI } from '../../services/api';
import './Register.css';

// Strict allowlist — these are the ONLY valid user types accepted by the API
const VALID_USER_TYPES = ['handyman', 'customer', 'shopkeeper'];

const INITIAL_FORM = {
  full_name: '',
  email: '',
  password: '',
  user_type: '',   // intentionally empty so the user must make an explicit choice
  phone: '',
  location: '',
};

function Register() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors]   = useState({});
  const [apiError, setApiError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Field-level validation ────────────────────────────────────────────────
  const validate = (data) => {
    const errs = {};

    if (!data.full_name.trim())
      errs.full_name = 'Full name is required.';

    if (!data.email.trim())
      errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errs.email = 'Enter a valid email address.';

    if (!data.password)
      errs.password = 'Password is required.';
    else if (data.password.length < 6)
      errs.password = 'Password must be at least 6 characters.';

    // user_type must be one of the three exact values — no exceptions
    if (!VALID_USER_TYPES.includes(data.user_type))
      errs.user_type = 'Please select a valid role: handyman, customer, or shopkeeper.';

    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-level error on change
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    setSuccess('');

    // 1. Client-side validation (including user_type guard)
    const fieldErrors = validate(formData);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    // 2. Final safety check: never let an invalid user_type reach the API
    if (!VALID_USER_TYPES.includes(formData.user_type)) {
      setApiError('Submission blocked: invalid user role detected.');
      return;
    }

    setLoading(true);

    try {
      // POST to /api/register via the centralised axios instance
      await authAPI.register(formData);

      setSuccess('Registration successful! You can now log in.');
      setFormData(INITIAL_FORM);
      setErrors({});
    } catch (err) {
      // Prefer the API's error message; fall back to a generic string
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Registration failed. Please try again.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-wrapper">
      <div className="register-card">
        {/* Header */}
        <div className="register-header">
          <div className="register-icon">👤</div>
          <h2 className="register-title">Create Account</h2>
          <p className="register-subtitle">Join our platform today</p>
        </div>

        {/* API-level feedback banners */}
        {apiError && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">✕</span>
            {apiError}
          </div>
        )}
        {success && (
          <div className="alert alert-success" role="status">
            <span className="alert-icon">✓</span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="register-form">
          {/* Full Name */}
          <div className={`field-group ${errors.full_name ? 'has-error' : ''}`}>
            <label htmlFor="reg-full_name" className="field-label">
              Full Name <span className="required">*</span>
            </label>
            <input
              id="reg-full_name"
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Jane Doe"
              className="field-input"
              autoComplete="name"
              required
            />
            {errors.full_name && <p className="field-error">{errors.full_name}</p>}
          </div>

          {/* Email */}
          <div className={`field-group ${errors.email ? 'has-error' : ''}`}>
            <label htmlFor="reg-email" className="field-label">
              Email <span className="required">*</span>
            </label>
            <input
              id="reg-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jane@example.com"
              className="field-input"
              autoComplete="email"
              required
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className={`field-group ${errors.password ? 'has-error' : ''}`}>
            <label htmlFor="reg-password" className="field-label">
              Password <span className="required">*</span>
            </label>
            <input
              id="reg-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              className="field-input"
              autoComplete="new-password"
              minLength={6}
              required
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          {/* User Type — STRICT allowlist: handyman | customer | shopkeeper */}
          <div className={`field-group ${errors.user_type ? 'has-error' : ''}`}>
            <label htmlFor="reg-user_type" className="field-label">
              Role <span className="required">*</span>
            </label>
            <div className="select-wrapper">
              <select
                id="reg-user_type"
                name="user_type"
                value={formData.user_type}
                onChange={handleChange}
                className="field-select"
                required
              >
                {/* Empty placeholder — forces a conscious choice */}
                <option value="" disabled>
                  — Select your role —
                </option>
                <option value="handyman">Handyman</option>
                <option value="customer">Customer</option>
                <option value="shopkeeper">Shopkeeper</option>
              </select>
              <span className="select-chevron">▾</span>
            </div>
            {errors.user_type && <p className="field-error">{errors.user_type}</p>}
          </div>

          {/* Phone (optional) */}
          <div className="field-group">
            <label htmlFor="reg-phone" className="field-label">Phone</label>
            <input
              id="reg-phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              className="field-input"
              autoComplete="tel"
            />
          </div>

          {/* Location (optional) */}
          <div className="field-group">
            <label htmlFor="reg-location" className="field-label">Location</label>
            <input
              id="reg-location"
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="City, State"
              className="field-input"
              autoComplete="address-level2"
            />
          </div>

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> Registering…
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        <div className="auth-redirect">
          <p>Already have an account? <a href="/login">Sign In</a></p>
        </div>
      </div>
    </div>
  );
}

export default Register;
