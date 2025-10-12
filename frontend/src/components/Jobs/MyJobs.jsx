import { useState, useEffect } from 'react';
import { jobAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import JobApplications from './JobApplications';
import './Jobs.css';

function MyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    try {
      const response = await jobAPI.getAllJobs();
      // Filter to show only this employer's jobs
      const myJobs = response.data.jobs.filter(job => job.employer_id === user.id);
      setJobs(myJobs);
      setLoading(false);
    } catch (err) {
      setError('Failed to load jobs');
      setLoading(false);
    }
  };

  if (selectedJob) {
    return (
      <div className="my-jobs-detail">
        <button onClick={() => setSelectedJob(null)} className="back-btn">
          ← Back to My Jobs
        </button>
        <JobApplications jobId={selectedJob.id} jobTitle={selectedJob.title} />
      </div>
    );
  }

  if (loading) return <div>Loading your jobs...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="my-jobs-container">
      <h2>My Posted Jobs ({jobs.length})</h2>

      {jobs.length === 0 ? (
        <div className="empty-state">
          <p>You haven't posted any jobs yet.</p>
          <p>Click "Post Job" to create your first job posting!</p>
        </div>
      ) : (
        <div className="jobs-grid">
          {jobs.map((job) => (
            <div key={job.id} className="job-card my-job-card">
              <div className="job-header">
                <h3>{job.title}</h3>
                <span className={`status-pill ${job.status}`}>
                  {job.status}
                </span>
              </div>
              
              <p className="location">📍 {job.location}</p>
              
              {job.category_name && (
                <span className="category">{job.category_name}</span>
              )}
              
              {job.salary_min && job.salary_max && (
                <p className="salary">
                  ₹{job.salary_min} - ₹{job.salary_max}/hr
                </p>
              )}
              
              <p className="description">
                {job.description.substring(0, 100)}...
              </p>
              
              <div className="job-meta">
                <p className="posted-date">
                  Posted: {new Date(job.created_at).toLocaleDateString()}
                </p>
                <p className="expires">
                  Expires: {new Date(job.expires_at).toLocaleDateString()}
                </p>
              </div>
              
              <button 
                onClick={() => setSelectedJob(job)} 
                className="view-applications-btn"
              >
                View Applications
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyJobs;
