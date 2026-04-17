import { useState, useEffect } from 'react';
import { applicationAPI, jobAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './Jobs.css';
import './TableUtilities.css';

function JobApplications({ jobId, onBack }) {
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
      // Fetch job details to show title
      const jobRes = await jobAPI.getJob(jobId);
      setJob(jobRes.data.job);
      
      // Fetch applications
      const appsRes = await applicationAPI.getJobApplications(jobId);
      setApplications(appsRes.data.applications || []);
    } catch (err) {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId, newStatus) => {
    try {
      await applicationAPI.updateApplicationStatus(applicationId, newStatus);
      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted': return <span className="badge badge-success">Accepted</span>;
      case 'rejected': return <span className="badge badge-error">Rejected</span>;
      default: return <span className="badge badge-warning">Pending</span>;
    }
  };

  if (loading) return <div className="loading-state">Loading applications...</div>;

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
                  <td className="font-medium text-gray-900">{app.worker_name}</td>
                  <td className="text-gray-600">
                    {app.cover_letter ? (
                      <div className="text-sm">{app.cover_letter}</div>
                    ) : (
                      <span className="italic text-gray-400">No cover letter</span>
                    )}
                  </td>
                  <td className="text-gray-500">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td>{getStatusBadge(app.status)}</td>
                  <td>
                    {app.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleStatusUpdate(app.id, 'accepted')}
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
