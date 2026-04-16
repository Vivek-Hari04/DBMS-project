import { useState, useEffect } from 'react';
import { jobAPI, applicationAPI } from '../../services/api';
import './Jobs.css';
import { useAuth } from '../../context/AuthContext';

function JobList() {
  const { user, isHandyman } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applicationMessage, setApplicationMessage] = useState({ type: '', text: '' });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await jobAPI.getAllJobs();
      setJobs(response.data.jobs || []);
    } catch (err) {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  const viewJobDetails = (job) => {
    setSelectedJob(job);
    setShowApplicationForm(false);
    setApplicationMessage({ type: '', text: '' });
  };

  const closeJobDetails = () => {
    setSelectedJob(null);
    setShowApplicationForm(false);
    setCoverLetter('');
  };

  const submitApplication = async () => {
    if (!isHandyman) {
      setApplicationMessage({ type: 'error', text: 'Please login as a handyman to apply.' });
      return;
    }

    try {
      await applicationAPI.applyToJob({
        job_id: selectedJob.id,
        cover_letter: coverLetter,
      });
      setApplicationMessage({ type: 'success', text: 'Application submitted successfully!' });
      
      setTimeout(() => {
        closeJobDetails();
      }, 2000);
    } catch (err) {
      setApplicationMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to submit application.' 
      });
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    job.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-state">Loading jobs...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="jobs-dashboard">
      <div className="jobs-header">
        <h2 className="section-title">Available Jobs</h2>
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Search jobs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="empty-state card">
          <p>No jobs found matching your criteria.</p>
        </div>
      ) : (
        <div className="jobs-grid">
          {filteredJobs.map((job) => (
            <div key={job.id} className="job-card card">
              <div className="job-card-header">
                <h3>{job.title}</h3>
                {job.category_name && <span className="badge badge-primary">{job.category_name}</span>}
              </div>
              <p className="job-employer">Posted by: <strong>{job.employer_name}</strong></p>
              
              <div className="job-meta">
                <span className="meta-item">📍 {job.location}</span>
                {job.salary_min && job.salary_max && (
                  <span className="meta-item">💰 ₹{job.salary_min} - ₹{job.salary_max}/hr</span>
                )}
              </div>
              
              <p className="job-description">{job.description?.substring(0, 120)}...</p>
              
              <div className="job-footer">
                <span className="job-expires">Expires: {new Date(job.expires_at).toLocaleDateString()}</span>
                <button onClick={() => viewJobDetails(job)} className="btn btn-primary">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Standard SaaS Modal */}
      {selectedJob && (
        <div className="modal-overlay" onClick={closeJobDetails}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedJob.title}</h2>
              <button className="btn-close" onClick={closeJobDetails}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="job-detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Employer</span>
                  <span>{selectedJob.employer_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location</span>
                  <span>{selectedJob.location}</span>
                </div>
                {selectedJob.category_name && (
                  <div className="detail-item">
                    <span className="detail-label">Category</span>
                    <span className="badge badge-primary">{selectedJob.category_name}</span>
                  </div>
                )}
                {selectedJob.salary_min && selectedJob.salary_max && (
                  <div className="detail-item">
                     <span className="detail-label">Salary Range</span>
                     <span>₹{selectedJob.salary_min} - ₹{selectedJob.salary_max} / hour</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Expires</span>
                  <span>{new Date(selectedJob.expires_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>Description</h4>
                <p>{selectedJob.description}</p>
              </div>

              {selectedJob.requirements && (
                <div className="detail-section">
                  <h4>Requirements</h4>
                  <p>{selectedJob.requirements}</p>
                </div>
              )}

              <div className="detail-section contact-box">
                <h4>Contact Info</h4>
                {selectedJob.contact_phone && <div>📞 {selectedJob.contact_phone}</div>}
                {selectedJob.contact_email && <div>📧 {selectedJob.contact_email}</div>}
              </div>

              {applicationMessage.text && (
                <div className={`alert alert-${applicationMessage.type} mt-4`}>
                  {applicationMessage.text}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {isHandyman && !showApplicationForm ? (
                <button className="btn btn-primary w-full" onClick={() => setShowApplicationForm(true)}>
                  Apply for this Job
                </button>
              ) : isHandyman && showApplicationForm ? (
                <div className="application-form">
                  <label className="form-label">Cover Letter</label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Tell the employer why you're a perfect fit..."
                    className="form-textarea w-full"
                    rows="4"
                  />
                  <div className="form-actions mt-4">
                    <button onClick={submitApplication} className="btn btn-primary">Submit Tool</button>
                    <button onClick={() => setShowApplicationForm(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="read-only-msg">Login as a Handyman to apply.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobList;
