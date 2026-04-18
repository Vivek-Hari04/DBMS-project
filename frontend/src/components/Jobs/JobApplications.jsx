import { useState, useEffect } from 'react';
import { applicationAPI, jobAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import './Jobs.css';
import './TableUtilities.css';

function JobApplications({ jobId, onBack }) {
  const { user, isCustomer, isShopkeeper } = useAuth();
  const [applications, setApplications] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (jobId) {
      fetchJobAndApplications();
    }
  }, [jobId]);

  const fetchJobAndApplications = async () => {
    try {
      setLoading(true);
      console.log('[JobApplications] user', user);
      console.log('[JobApplications] role', user?.user_type);
      // Fetch job details to show title
      const jobRes = await jobAPI.getJob(jobId);
      // Backend returns the job object directly
      const jobObj = jobRes.data?.job || jobRes.data;
      console.log('[JobApplications] job response', jobObj);
      setJob(jobObj);
      
      // Fetch applications
      const appsRes = await applicationAPI.getJobApplications(jobId);
      console.log('[JobApplications] applications response', appsRes.data);
      setApplications(appsRes.data.applications || []);
    } catch (err) {
      console.log('[JobApplications] fetch error', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      await applicationAPI.updateApplicationStatus(applicationId, newStatus);
      toast.success('Application rejected');
      fetchJobAndApplications(); // keep job + other apps in sync
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleHire = async (workerId) => {
    try {
      await jobAPI.hireWorker(jobId, workerId);
      toast.success('Worker hired successfully');
      fetchJobAndApplications();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to hire worker');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted': return <span className="badge badge-success">Hired</span>;
      case 'rejected': return <span className="badge badge-error">Rejected</span>;
      default: return <span className="badge badge-warning">Pending</span>;
    }
  };

  if (loading) return <div className="loading-state">Loading applications...</div>;

  const isEmployerUser = isCustomer || isShopkeeper;
  const isJobOwner = isEmployerUser && user?.id && job?.employer_id === user.id;

  return (
    <div className="job-applications-view">
      <div className="section-header">
        <div>
          <button onClick={onBack} className="btn-link mb-4">← Back to My Jobs</button>
          <h2 className="section-title">Applications for {job?.title}</h2>
        </div>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {applications.length === 0 ? (
        <div className="empty-state card">
          <p>No applications received yet for this job.</p>
        </div>
      ) : (
        <div className="table-container card p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th>Applicant Name</th>
                <th>Cover Letter</th>
                <th>Applied On</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id}>
                  <td className="font-medium text-gray-900">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {app.profile_pic ? (
                        <img src={app.profile_pic} alt="avatar" style={{width: 36, height: 36, borderRadius: '50%', objectFit: 'cover'}} />
                      ) : (
                        <div style={{width: 36, height: 36, borderRadius: '50%', background: '#eaebef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#6d7280'}}>
                          {app.worker_name ? app.worker_name[0].toUpperCase() : '?'}
                        </div>
                      )}
                      <div>
                        <div>{app.worker_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                          {app.average_rating > 0 ? `★ ${Number(app.average_rating).toFixed(1)} / 5.0` : 'No ratings yet'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-gray-600">
                    {app.cover_letter ? (
                      <div className="text-sm">{app.cover_letter}</div>
                    ) : (
                      <span className="italic text-gray-400">No cover letter</span>
                    )}
                  </td>
                  <td className="text-gray-500">
                    {new Date(app.applied_at).toLocaleDateString()}
                  </td>
                  <td>{getStatusBadge(app.status)}</td>
                  <td>
                    {isJobOwner && app.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleHire(app.worker_id)}
                          className="btn btn-primary text-sm p-2 mr-2"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(app.id, 'rejected')}
                          className="btn btn-secondary text-sm p-2"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default JobApplications;
