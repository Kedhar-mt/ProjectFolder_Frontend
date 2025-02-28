import { useEffect, useState } from "react";
import api from "../utils/api";
import { handleLogout } from '../utils/api';

const UserDashboard = () => {
  const [folders, setFolders] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      // Check if we have a token first
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Not authenticated. Please log in again.");
        setLoading(false);
        return;
      }
      
      // Use the api instance with proper auth headers
      const response = await api.get("/api/folder");
      
      // Filter out disabled folders and folders without images
      const activeFolders = response.data.filter(
        (folder) =>
          !folder.isDisabled && folder.images && folder.images.length > 0
      );
      setFolders(activeFolders);
      setError(null);
    } catch (err) {
      console.error("Error fetching folders:", err);
      
      // Check if it's an authentication error
      if (err.response?.status === 401) {
        setError("Authentication failed. Please log in again.");
        // Clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userId");
        // Optional: redirect to login
        // window.location.href = '/login';
      } else {
        setError(err.response?.data?.message || "Error loading folders");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-message">Loading folders...</div>;
  if (error) return <div className="error-message">Error: {error}</div>;

  return (
    <div className="user-dashboard">
      <h2 className="dashboard-title">User Dashboard</h2>
      <button onClick={handleLogout} className="logout-button">
        Logout
      </button>
      
      {folders.length === 0 ? (
        <div className="no-content-message">No folders available</div>
      ) : (
        <div className="folders-list">
          {folders.map((folder) => (
            <div key={folder._id} className="folder-item">
              <div className="folder-header">
                <h3 className="folder-name">{folder.name}</h3>
              </div>
              
              <div className="folder-content">
                <div className="images-section">
                  <h4 className="section-subtitle">Images</h4>
                  <div className="images-grid">
                    {folder.images?.map((image) => (
                      <div key={image._id} className="image-item">
                        <img
                          src={image.path}
                          alt={image.name}
                          className="image-thumbnail"
                        />
                        <div className="image-info">
                          <p className="image-name">{image.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;