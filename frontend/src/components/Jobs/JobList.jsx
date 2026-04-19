import { useState, useEffect } from 'react';
import { jobAPI, applicationAPI } from '../../services/api';
import './Jobs.css';
import { useAuth } from '../../context/AuthContext';

function JobList() {
  const { user, isHandyman } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('public'); // public | offers
  const [browseTab, setBrowseTab] = useState('available'); // available | expired
  
  // Modal states
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applicationMessage, setApplicationMessage] = useState({ type: '', text: '' });
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [locationTerm, setLocationTerm] = useState('');
  const [workerApps, setWorkerApps] = useState([]);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    // initial load (no filters)
    fetchJobs({ q: '', location: '' });
    if (isHandyman && user) {
      fetchWorkerApps();
      fetchOffers();
    }
  }, [isHandyman, user]);

  const handleSearch = () => {
    fetchJobs({ q: searchTerm, location: locationTerm });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const fetchWorkerApps = async () => {
    try {
      const res = await applicationAPI.getWorkerApplications(user.id);
      setWorkerApps(res.data.applications || []);
    } catch (err) {}
  };

  const fetchJobs = async ({ q, location }) => {
    try {
      setLoading(true);
      const response = await jobAPI.searchJobs({ q, location });
      setJobs(response.data.jobs || []);
    } catch (err) {
      setError('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      const res = await jobAPI.getJobOffers();
      setOffers(res.data.jobs || []);
    } catch (e) {
      // ignore; user may not be worker or no offers
      setOffers([]);
    }
  };

  const respondOffer = async (jobId, action) => {
    try {
      await jobAPI.respondToOffer(jobId, action);
      await fetchOffers();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to respond to offer');
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
      setApplicationMessage({ type: 'error', text: 'Please login as a worker to apply.' });
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
        fetchWorkerApps(); // To update the "Already Applied" status
        fetchJobs({ q: searchTerm, location: locationTerm }); // To refresh job list state
      }, 2000);
    } catch (err) {
      setApplicationMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to submit application.' 
      });
    }
  };

  const now = new Date();
  const availableJobs = jobs.filter(j => j.status === 'open' && new Date(j.expires_at) > now && !j.hired_worker_id);
  const expiredJobs = jobs.filter(j => j.status !== 'open' || new Date(j.expires_at) <= now || j.hired_worker_id);

  const filteredJobs = view === 'public' && browseTab === 'expired' ? expiredJobs : availableJobs;

  if (loading) return <div className="loading-state">Loading jobs...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="jobs-dashboard">
      <div className="jobs-header">
        <h2 className="section-title">{view === 'offers' ? 'Job Offers' : 'Available Jobs'}</h2>
        <div className="search-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isHandyman && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn ${view === 'public' ? 'btn-primary' : 'btn-secondary'} text-sm`}
                onClick={() => setView('public')}
              >
                Browse Jobs
              </button>
              <button
                className={`btn ${view === 'offers' ? 'btn-primary' : 'btn-secondary'} text-sm`}
                onClick={() => setView('offers')}
              >
                Job Offers
              </button>
            </div>
          )}
          {view === 'public' && (
            <>
              <input 
                type="text" 
                placeholder="Search jobs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="form-input"
              />
              <input
                type="text"
                placeholder="Search by location (state/district/pin)..."
                value={locationTerm}
                onChange={(e) => setLocationTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="form-input"
              />
              <button className="btn btn-primary text-sm" onClick={handleSearch}>
                Search
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'public' && isHandyman && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <button className={`btn ${browseTab === 'available' ? 'btn-primary' : 'btn-secondary'} text-sm`} onClick={() => setBrowseTab('available')}>
            Available
          </button>
          <button className={`btn ${browseTab === 'expired' ? 'btn-primary' : 'btn-secondary'} text-sm`} onClick={() => setBrowseTab('expired')}>
            Expired / Hired
          </button>
        </div>
      )}

      {view === 'offers' ? (
        offers.length === 0 ? (
          <div className="empty-state card">
            <p>No job offers yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {offers.map((job) => (
              <div key={job.id} className="job-card card">
                <div className="job-card-header">
                  <h3>{job.title}</h3>
                  <span className="badge badge-primary">Private</span>
                </div>
                <p className="job-employer">
                  Offered by: <strong>{job.employer_name}</strong>
                </p>
                <div className="job-meta">
                  <span className="meta-item">📍 {job.location}</span>
                </div>
                <p className="job-description">{job.description?.substring(0, 160)}...</p>
                <div className="job-footer" style={{ gap: 8 }}>
                  {job.status === 'open' ? (
                    <>
                      <button className="btn btn-primary" onClick={() => respondOffer(job.id, 'accept')}>
                        Accept
                      </button>
                      <button className="btn btn-secondary" onClick={() => respondOffer(job.id, 'reject')}>
                        Reject
                      </button>
                    </>
                  ) : (
                    <span 
                      className={`badge ${job.hired_worker_id === user?.id ? 'badge-primary' : 'badge-secondary'}`} 
                      style={{ 
                        color: 'white', 
                        backgroundColor: job.hired_worker_id === user?.id ? '#10b981' : '#ef4444', 
                        padding: '4px 8px', 
                        borderRadius: '4px' 
                      }}>
                      {job.hired_worker_id === user?.id ? 'Accepted' : 'Rejected'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredJobs.length === 0 ? (
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
              <p className="job-employer">
                Posted by: <strong>{job.employer_name}</strong>
                <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '8px' }}>
                  {job.average_rating > 0 ? `★ ${Number(job.average_rating).toFixed(1)}/5.0` : '(No ratings yet)'}
                </span>
              </p>
              
              <div className="job-meta">
                <span className="meta-item">📍 {job.location}</span>
                {job.salary_min && job.salary_max && (
                  <span className="meta-item">💰 ₹{job.salary_min} - ₹{job.salary_max}/hr</span>
                )}
              </div>
              
              <p className="job-description">{job.description?.substring(0, 120)}...</p>
              
              <div className="job-footer">
                <span className="job-expires">Expires: {new Date(job.expires_at).toLocaleDateString()}</span>
                {workerApps.find(app => app.job_id === job.id) ? (
                  <button disabled className="btn btn-secondary" style={{opacity:0.6, cursor:'not-allowed'}}>
                    Already Applied
                  </button>
                ) : (
                  <button onClick={() => viewJobDetails(job)} className="btn btn-primary">
                    View Details
                  </button>
                )}
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
                  <span>
                    {selectedJob.employer_name}
                    <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '8px' }}>
                      {selectedJob.average_rating > 0 ? `★ ${Number(selectedJob.average_rating).toFixed(1)}` : '(No ratings)'}
                    </span>
                  </span>
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
                <>
                  {selectedJob.status !== 'open' || selectedJob.hired_worker_id || new Date(selectedJob.expires_at) <= new Date() ? (
                    <button className="btn btn-secondary w-full" disabled style={{opacity:0.6, cursor:'not-allowed'}}>
                      {selectedJob.hired_worker_id ? 'Position Filled' : 'Job Expired'}
                    </button>
                  ) : (
                    <button className="btn btn-primary w-full" onClick={() => setShowApplicationForm(true)}>
                      Apply for this Job
                    </button>
                  )}
                </>
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
                <div className="read-only-msg">Login as a Worker to apply.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobList;
