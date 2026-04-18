import { useState, useEffect } from 'react';
import { jobAPI, ratingAPI, profileAPI } from '../../services/api';
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
  const [contactModal, setContactModal] = useState({ show: false, loading: false, profile: null });

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    try {
      setLoading(true);
      const response = await jobAPI.getMyJobs();
      setJobs(response.data.jobs || []);
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

  const openContact = async (workerId) => {
    setContactModal({ show: true, loading: true, profile: null });
    try {
      const res = await profileAPI.getProfile(workerId);
      const data = res.data.profile || res.data;
      setContactModal({ show: true, loading: false, profile: data });
    } catch (e) {
      toast.error('Failed to load worker profile');
      setContactModal({ show: false, loading: false, profile: null });
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
                    {job.status === 'closed' && job.hired_worker_id && (
                      <button
                        onClick={() => openContact(job.hired_worker_id)}
                        className="btn btn-secondary text-sm mr-2"
                      >
                        View Contact
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

      {contactModal.show && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
          }}
          onClick={() => setContactModal({ show: false, loading: false, profile: null })}
        >
          <div
            className="card"
            style={{ width: 520, maxWidth: '92vw', padding: '1.25rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Worker Contact</h3>
            {contactModal.loading ? (
              <div className="loading-state">Loading profile...</div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  {contactModal.profile?.avatar_url ? (
                    <img
                      src={contactModal.profile.avatar_url}
                      alt="avatar"
                      style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: '#eaebef',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#6d7280',
                      }}
                    >
                      {contactModal.profile?.full_name ? contactModal.profile.full_name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700 }}>{contactModal.profile?.full_name}</div>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>{contactModal.profile?.location || 'Location not provided'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  <div><strong>Email:</strong> {contactModal.profile?.email}</div>
                  <div><strong>Phone:</strong> {contactModal.profile?.phone || 'Not provided'}</div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                className="btn btn-secondary text-sm"
                onClick={() => setContactModal({ show: false, loading: false, profile: null })}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyJobs;
