import { useState, useEffect } from 'react';
import { applicationAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './Jobs.css';

function MyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{app.job_title}</td>
                  <td className="p-4 text-gray-600">{app.employer_name}</td>
                  <td className="p-4 text-gray-500">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">{getStatusBadge(app.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MyApplications;
