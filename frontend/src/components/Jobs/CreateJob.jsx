import { useState } from 'react';
import { jobAPI } from '../../services/api';
import './Jobs.css';
import { useNavigate } from 'react-router-dom';

function CreateJob() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    salary_min: '',
    salary_max: '',
    duration: '',
    category_id: 1, // Defaulting for now
    contact_phone: '',
    contact_email: '',
    expires_in_days: 30, // Default to 30 days
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['salary_min', 'salary_max', 'category_id', 'expires_in_days'].includes(name) 
        ? (value ? Number(value) : '') 
        : value,
    }));
  };

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
            <label className="form-label">Location <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="form-input w-full"
              required
              placeholder="City, Neighborhood"
            />
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
