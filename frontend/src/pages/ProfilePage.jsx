import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import toast from 'react-hot-toast';
import './ProfilePage.css';

function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location: '',
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await profileAPI.getProfile(user.id);
      const data = response.data.profile || response.data; // Depending on actual API response format
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        location: data.location || '',
        bio: data.bio || '',
      });
    } catch (err) {
      setError('Failed to load profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    
    try {
      const response = await profileAPI.updateProfile(user.id, formData);
      setProfile(response.data.profile || formData);
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await profileAPI.deleteAccount(user.id, { password: deletePassword });
      toast.success("Account scheduled for deletion.");
      logout();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete account.');
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-card card">
        <h2 className="card-title">My Profile</h2>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">✕</span> {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert-success">
            <span className="alert-icon">✓</span> {success}
          </div>
        )}

        {!isEditing ? (
          <div className="profile-view">
            <div className="profile-grid">
              <div className="profile-field">
                <span className="field-label">Full Name</span>
                <span className="field-value">{profile?.full_name}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Email Address</span>
                <span className="field-value">{profile?.email}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Role</span>
                <span className="field-value capitalize">
                  {profile?.user_type === 'customer' ? 'employer' : profile?.user_type}
                </span>
              </div>
              <div className="profile-field">
                <span className="field-label">Phone</span>
                <span className="field-value">{profile?.phone || 'Not provided'}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Location</span>
                <span className="field-value">{profile?.location || 'Not provided'}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Member Since</span>
                <span className="field-value">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="profile-field bio-field">
              <span className="field-label">Bio</span>
              <p className="field-value bio-text">{profile?.bio || 'No bio available yet.'}</p>
            </div>

            <div className="profile-actions">
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                Edit Profile
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="+1 234 567 890"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="City, State"
                />
              </div>
            </div>

            <div className="form-group bio-group">
              <label className="form-label">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="form-textarea"
                rows="4"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="danger-zone card mt-4" style={{ borderColor: '#f87171' }}>
        <h3 className="text-red-500 font-semibold mb-2">Danger Zone</h3>
        <p className="text-gray-600 mb-4 text-sm">
          Once you delete your account, you will lose access immediately. Your account and data will be permanently deleted after 30 days. You can recover your account anytime within the 30-day window by trying to log in.
        </p>
        <button className="btn" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }} onClick={() => setShowDeleteModal(true)}>
          Delete Account
        </button>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 className="card-title text-red-500">Delete Account</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your account will be suspended and permanently deleted in 30 days. Please enter your password to confirm.
            </p>
            <form onSubmit={handleDeleteAccount}>
              <div className="form-group mb-4">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="form-input w-full"
                  required
                />
              </div>
              <div className="form-actions flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button type="submit" className="btn" style={{ background: '#dc2626', color: 'white' }}>Confirm Delete</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
