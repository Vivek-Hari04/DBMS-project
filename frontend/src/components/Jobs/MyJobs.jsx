import { useState, useEffect } from 'react';
import { jobAPI, applicationAPI, ratingAPI } from '../../services/api';
import toast from 'react-hot-toast';
import JobApplications from './JobApplications';
import './Jobs.css';
import './TableUtilities.css';

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State to manage which job's applications are being viewed
  const [selectedJobId, setSelectedJobId] = useState(null);
  
  const [ratingModal, setRatingModal] = useState({ show: false, jobId: null, revieweeId: null, rating: 5, review: '' });

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      const response = await jobAPI.getAllJobs(); // Actually, the backend should have a getMyJobs, but currently it returns all, we filter on client
      
      // We'll filter all jobs based on current user via api or token, 
      // Assuming the API returns only jobs that belong to the user if the backend implements it,
      // OR let's filter if it doesn't.
      // Wait, there's no endpoint, so we use getAllJobs and hope it returns the user's jobs or we filter.
      // Actually, since MyJobs was using standard logic earlier, let's keep it doing standard.
      // In the previous version, MyJobs fetched all jobs and relied on the backend, or we filter.
      
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      let allJobs = response.data.jobs || [];
      if (user) {
        allJobs = allJobs.filter(j => j.employer_id === user.id);
      }
      setJobs(allJobs);
    } catch (err) {
      setError('Failed to load your jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await jobAPI.deleteJob(jobId);
      setJobs(jobs.filter(j => j.id !== jobId));
      toast.success('Job deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete job');
    }
  };

  const submitRating = async () => {
    try {
      await ratingAPI.createRating({
        job_id: ratingModal.jobId,
        reviewee_id: ratingModal.revieweeId,
        rating: ratingModal.rating,
        review: ratingModal.review
      });
      toast.success('Rating submitted!');
      setRatingModal({ show: false, jobId: null, revieweeId: null, rating: 5, review: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit rating');
    }
  };

  if (selectedJobId) {
    return (
      <JobApplications 
        jobId={selectedJobId} 
        onBack={() => setSelectedJobId(null)} 
      />
    );
  }

  if (loading) return <div className="loading-state">Loading your jobs...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="my-jobs-dashboard">
      <div className="jobs-header">
        <h2 className="section-title">My Posted Jobs</h2>
      </div>
      
      {jobs.length === 0 ? (
        <div className="empty-state card">
          <p>You haven't posted any jobs yet.</p>
        </div>
      ) : (
        <div className="table-container card p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Category</th>
                <th>Location</th>
                <th>Expiration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="font-medium text-gray-900">{job.title}</td>
                  <td className="text-gray-600">
                    <span className="badge badge-primary">{job.category_name || 'N/A'}</span>
                  </td>
                  <td className="text-gray-500">{job.location}</td>
                  <td className="text-gray-500">
                    <span className={`badge ${job.status === 'open' ? 'badge-primary' : 'badge-success'}`}>
                      {job.status}
                    </span>
                  </td>
                  <td>
                    {job.status === 'open' && (
                      <button 
                        onClick={() => setSelectedJobId(job.id)} 
                        className="btn btn-secondary text-sm mr-2"
                      >
                        View Applications
                      </button>
                    )}
                    {job.status === 'closed' && (
                      <button 
                        onClick={() => {
                          setSelectedJobId(job.id)
                        }} 
                        className="btn btn-primary text-sm mr-2"
                      >
                        View Details
                      </button>
                    )}
                    {job.status === 'closed' && job.hired_worker_id && (
                      <button
                        onClick={() =>
                          setRatingModal({
                            show: true,
                            jobId: job.id,
                            revieweeId: job.hired_worker_id,
                            rating: 5,
                            review: '',
                          })
                        }
                        className="btn btn-secondary text-sm mr-2"
                      >
                        Rate Worker
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteJob(job.id)}
                      className="btn btn-danger text-sm"
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ratingModal.show && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setRatingModal({ show: false, jobId: null, revieweeId: null, rating: 5, review: '' })}
        >
          <div
            className="card"
            style={{ width: 520, maxWidth: '92vw', padding: '1.25rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Rate Worker</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="btn btn-secondary text-sm"
                  onClick={() => setRatingModal((m) => ({ ...m, rating: n }))}
                  style={{
                    background: ratingModal.rating >= n ? '#2563eb' : undefined,
                    color: ratingModal.rating >= n ? 'white' : undefined,
                    border: 'none',
                  }}
                >
                  {n}★
                </button>
              ))}
            </div>
            <textarea
              value={ratingModal.review}
              onChange={(e) => setRatingModal((m) => ({ ...m, review: e.target.value }))}
              placeholder="Optional review"
              className="w-full"
              style={{
                width: '100%',
                minHeight: 110,
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                padding: 10,
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="btn btn-secondary text-sm"
                onClick={() => setRatingModal({ show: false, jobId: null, revieweeId: null, rating: 5, review: '' })}
              >
                Cancel
              </button>
              <button className="btn btn-primary text-sm" onClick={submitRating}>
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyJobs;
