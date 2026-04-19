import { useEffect, useState } from 'react';
import { jobAPI, profileAPI } from '../../services/api';
import './Jobs.css';
import { useNavigate } from 'react-router-dom';
import StructuredLocationField from '../Location/StructuredLocationField';
import { useAuth } from '../../context/AuthContext';

function CreateJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    salary_min: '',
    salary_max: '',
    duration: '',
    category_id: 11, // General Labourer ID
    contact_phone: '',
    contact_email: '',
    expiry_days: 7, // Default to 7 days (backend allows max 7)
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [useProfileLocation, setUseProfileLocation] = useState(false);
  const [categories, setCategories] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['salary_min', 'salary_max', 'category_id', 'expiry_days'].includes(name) 
        ? (value ? Number(value) : '') 
        : value,
    }));
  };

  useEffect(() => {
    const run = async () => {
      if (!useProfileLocation) return;
      try {
        if (!user?.id) return;
        const res = await profileAPI.getProfile(user.id);
        const p = res.data.profile || res.data;
        if (p?.location) {
          setFormData((prev) => ({ ...prev, location: p.location }));
        }
      } catch (e) {
        // silent; user can still fill manually
      }
    };
    const fetchCats = async () => {
      try {
        const res = await jobAPI.getCategories();
        setCategories(res.data.categories || []);
        if (res.data.categories && res.data.categories.length > 0) {
          const general = res.data.categories.find(c => c.name.toLowerCase().includes('general'));
          if (general) {
            setFormData(prev => ({ ...prev, category_id: general.id }));
          }
        }
      } catch (e) {
      }
    };
    run();
    fetchCats();
  }, [useProfileLocation, user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await jobAPI.createJob(formData);
      setSuccess('Job posted successfully!');
      
      setTimeout(() => {
        navigate('/dashboard/my-jobs');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-job-dashboard">
      <div className="card max-w-3xl mx-auto">
        <h2 className="card-title">Post a New Job</h2>
        
        {error && <div className="alert alert-error mb-4">{error}</div>}
        {success && <div className="alert alert-success mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          {/* Main Info */}
          <div className="form-group mb-4" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Job Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input w-full"
              required
              placeholder="e.g. Need a plumber for pipe leak"
            />
          </div>

          <div className="form-group mb-4" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Description <span className="text-red-500">*</span></label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea w-full"
              rows="4"
              required
              placeholder="Describe the job in detail..."
            />
          </div>

          {/* Details */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <label className="form-label" style={{ margin: 0 }}>
                Location <span className="text-red-500">*</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={useProfileLocation}
                  onChange={(e) => setUseProfileLocation(e.target.checked)}
                />
                Use my profile location
              </label>
            </div>
            <div style={{ marginTop: 10 }}>
              <StructuredLocationField
                value={formData.location}
                onChange={(locStr) => setFormData((prev) => ({ ...prev, location: locStr }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Duration</label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="form-input w-full"
              placeholder="e.g. 2 hours, 1 day"
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Category</label>
            <div className="select-wrapper">
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="field-select"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="select-chevron">▾</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Min Salary (₹) </label>
            <input
              type="number"
              name="salary_min"
              value={formData.salary_min}
              onChange={handleChange}
              className="form-input w-full"
              min="0"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Max Salary (₹) </label>
            <input
              type="number"
              name="salary_max"
              value={formData.salary_max}
              onChange={handleChange}
              className="form-input w-full"
              min="0"
            />
          </div>

          <div className="form-group mb-4" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Requirements</label>
            <textarea
              name="requirements"
              value={formData.requirements}
              onChange={handleChange}
              className="form-textarea w-full"
              rows="3"
              placeholder="Any specific tools, skills, or experience needed?"
            />
          </div>

          <div className="form-group " style={{ gridColumn: '1 / -1' }}>
            <h4 className="form-subtitle mt-4 mb-2 text-gray-700 font-semibold">Contact Information</h4>
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Contact Phone</label>
            <input
              type="tel"
              name="contact_phone"
              value={formData.contact_phone}
              onChange={handleChange}
              className="form-input w-full"
            />
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Contact Email</label>
            <input
              type="email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleChange}
              className="form-input w-full"
            />
          </div>

          <div className="form-actions" style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
            <button 
              type="button" 
              className="btn btn-secondary mr-2" 
              onClick={() => navigate('/dashboard/my-jobs')}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
            >
              {loading ? 'Posting Job...' : 'Post Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateJob;
