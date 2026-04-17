import { useState, useEffect } from 'react';
import { jobAPI } from '../../services/api';
import JobApplications from './JobApplications';
import './Jobs.css';
import './TableUtilities.css';

function MyJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State to manage which job's applications are being viewed
  const [selectedJobId, setSelectedJobId] = useState(null);

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
                    {new Date(job.expires_at).toLocaleDateString()}
                  </td>
                  <td>
                    <button 
                      onClick={() => setSelectedJobId(job.id)} 
                      className="btn btn-secondary text-sm"
                    >
                      View Applications
                    </button>
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

export default MyJobs;
