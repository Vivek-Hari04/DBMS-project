import { useState, useEffect } from 'react';
import { applicationAPI, ratingAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Jobs.css';

function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ratingModal, setRatingModal] = useState({ show: false, jobId: null, revieweeId: null, rating: 5, review: '' });

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await applicationAPI.getWorkerApplications(user.id);
      setApplications(response.data.applications || []);
    } catch (err) {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted': return <span className="badge badge-success">Accepted</span>;
      case 'rejected': return <span className="badge badge-error">Rejected</span>;
      default: return <span className="badge badge-warning">Pending</span>;
    }
  };

  const submitRating = async () => {
    try {
      await ratingAPI.createRating({
        job_id: ratingModal.jobId,
        reviewee_id: ratingModal.revieweeId,
        rating: ratingModal.rating,
        review: ratingModal.review,
      });
      toast.success('Rating submitted!');
      setRatingModal({ show: false, jobId: null, revieweeId: null, rating: 5, review: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit rating');
    }
  };

  if (loading) return <div className="loading-state">Loading applications...</div>;
  if (error) return <div className="alert alert-error">{error}</div>;

  return (
    <div className="applications-dashboard">
      <h2 className="section-title mb-4">My Applications</h2>
      
      {applications.length === 0 ? (
        <div className="empty-state card">
          <p>You haven't applied to any jobs yet.</p>
        </div>
      ) : (
        <div className="table-container card p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Job Title</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Employer</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Applied On</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Status</th>
                <th className="p-4 font-semibold text-gray-600 text-sm uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{app.job_title}</td>
                  <td className="p-4 text-gray-600">{app.employer_name}</td>
                  <td className="p-4 text-gray-500">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">{getStatusBadge(app.status)}</td>
                  <td className="p-4">
                    {app.status === 'accepted' && app.job_status === 'closed' && app.employer_id && (
                      <button
                        className="btn btn-secondary text-sm"
                        onClick={() =>
                          setRatingModal({
                            show: true,
                            jobId: app.job_id,
                            revieweeId: app.employer_id,
                            rating: 5,
                            review: '',
                          })
                        }
                      >
                        Rate Employer
                      </button>
                    )}
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
            <h3 className="section-title" style={{ marginBottom: '0.75rem' }}>Rate Employer</h3>
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

export default MyApplications;
