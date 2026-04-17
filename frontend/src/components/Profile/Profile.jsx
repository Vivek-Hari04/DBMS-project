import { useState, useEffect } from 'react';
import { profileAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './Profile.css';

function Profile({ userId }) {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    location: '',
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await profileAPI.getProfile(userId);
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name,
        phone: response.data.phone || '',
        location: response.data.location || '',
        bio: response.data.bio || '',
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to load profile');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await profileAPI.updateProfile(userId, formData);
      setProfile(response.data.profile);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="profile-container">
      <h2>Profile</h2>

      {!isEditing ? (
        <div className="profile-view">
          <div className="profile-field">
            <strong>Name:</strong> {profile.full_name}
          </div>
          <div className="profile-field">
            <strong>Email:</strong> {profile.email}
          </div>
          <div className="profile-field">
            <strong>User Type:</strong> {profile.user_type}
          </div>
          <div className="profile-field">
            <strong>Phone:</strong> {profile.phone || 'Not provided'}
          </div>
          <div className="profile-field">
            <strong>Location:</strong> {profile.location || 'Not provided'}
          </div>
          <div className="profile-field">
            <strong>Bio:</strong> {profile.bio || 'No bio yet'}
          </div>
          <div className="profile-field">
            <strong>Member Since:</strong> {new Date(profile.created_at).toLocaleDateString()}
          </div>
          
          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="profile-edit">
          <div className="form-group">
            <label>Full Name:</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Location:</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Bio:</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows="4"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="button-group">
            <button type="submit">Save Changes</button>
            <button type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Profile;
