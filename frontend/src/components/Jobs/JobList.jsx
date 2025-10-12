import { useState, useEffect } from 'react';
import { jobAPI, applicationAPI } from '../../services/api';
import './Jobs.css';
import { useAuth } from '../../context/AuthContext';

function JobList() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applicationMessage, setApplicationMessage] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await jobAPI.getAllJobs();
      setJobs(response.data.jobs || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load jobs');
      setLoading(false);
    }
  };

  const viewJobDetails = (job) => {
    setSelectedJob(job);
    setShowApplicationForm(false);
    setApplicationMessage('');
  };

  const closeJobDetails = () => {
    setSelectedJob(null);
    setShowApplicationForm(false);
    setCoverLetter('');
    setApplicationMessage('');
  };

  const handleApply = () => {
    setShowApplicationForm(true);
  };

  const submitApplication = async () => {
    if (!user || user.user_type !== 'worker') {
      setApplicationMessage('Please login as a worker to apply');
      return;
    }

    try {
      await applicationAPI.applyToJob({
        job_id: selectedJob.id,
        //worker_id: workerId,
        cover_letter: coverLetter,
      });
      setApplicationMessage('Application submitted successfully!');
      setCoverLetter('');
      setShowApplicationForm(false);
      
      // Refresh to show updated status
      setTimeout(() => {
        setApplicationMessage('');
      }, 3000);
    } catch (err) {
      setApplicationMessage(err.response?.data?.error || 'Failed to submit application');
    }
  };

  if (loading) return <div>Loading jobs...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="job-list-container">
      <h2>Available Jobs ({jobs.length})</h2>

      {jobs.length === 0 ? (
        <p>No jobs available at the moment.</p>
      ) : (
        <div className="jobs-grid">
          {jobs.map((job) => (
            <div key={job.id} className="job-card">
              <h3>{job.title}</h3>
              <p className="employer">Posted by: {job.employer_name}</p>
              <p className="location">📍 {job.location}</p>
              {job.category_name && <span className="category">{job.category_name}</span>}
              {job.salary_min && job.salary_max && (
                <p className="salary">
                  ₹{job.salary_min} - ₹{job.salary_max} per hour
                </p>
              )}
              <p className="description">{job.description.substring(0, 100)}...</p>
              <p className="expires">
                Expires: {new Date(job.expires_at).toLocaleDateString()}
              </p>
              <button onClick={() => viewJobDetails(job)} className="view-btn">
                View Details & Apply
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="modal-overlay" onClick={closeJobDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeJobDetails}>×</button>
            <h2>{selectedJob.title}</h2>
            <p><strong>Employer:</strong> {selectedJob.employer_name}</p>
            <p><strong>Location:</strong> {selectedJob.location}</p>
            {selectedJob.category_name && (
              <p><strong>Category:</strong> {selectedJob.category_name}</p>
            )}
            {selectedJob.salary_min && selectedJob.salary_max && (
              <p><strong>Salary:</strong> ₹{selectedJob.salary_min} - ₹{selectedJob.salary_max} per hour</p>
            )}
            {selectedJob.duration && (
              <p><strong>Duration:</strong> {selectedJob.duration}</p>
            )}
            <div className="description-full">
              <strong>Description:</strong>
              <p>{selectedJob.description}</p>
            </div>
            {selectedJob.requirements && (
              <div>
                <strong>Requirements:</strong>
                <p>{selectedJob.requirements}</p>
              </div>
            )}
            <div className="contact-info">
              <strong>Contact:</strong>
              {selectedJob.contact_phone && <p>📞 {selectedJob.contact_phone}</p>}
              {selectedJob.contact_email && <p>📧 {selectedJob.contact_email}</p>}
            </div>
            <p className="expires-detail">
              <strong>Expires:</strong> {new Date(selectedJob.expires_at).toLocaleString()}
            </p>

            {applicationMessage && (
              <div className={applicationMessage.includes('success') ? 'success' : 'error'}>
                {applicationMessage}
              </div>
            )}

            {!showApplicationForm ? (
              <button className="apply-btn" onClick={handleApply}>
                Apply for this Job
              </button>
            ) : (
              <div className="application-form">
                <h3>Submit Your Application</h3>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell the employer why you're a great fit for this job..."
                  rows="5"
                  className="cover-letter-input"
                />
                <div className="button-group">
                  <button onClick={submitApplication} className="submit-application-btn">
                    Submit Application
                  </button>
                  <button onClick={() => setShowApplicationForm(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default JobList;
