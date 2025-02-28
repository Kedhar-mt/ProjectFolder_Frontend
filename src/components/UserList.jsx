import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const UserList = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    role: 'user',
    password: '' // Only used for new user creation
  });
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    pageSize: 10,
    startRecord: 0,
    endRecord: 0
  });

  useEffect(() => {
    // When searchQuery changes, always reset to page 1 and fetch results
    if (searchQuery.trim() !== '') {
      setPagination(prev => ({
        ...prev,
        currentPage: 1
      }));
      fetchUsers(1, pagination.pageSize, searchQuery);
    } else {
      // When search is cleared, fetch normal paginated results
      fetchUsers(pagination.currentPage, pagination.pageSize, '');
    }
  }, [searchQuery]);

  // This effect handles pagination changes (page number, page size)
  useEffect(() => {
    // Only fetch if not triggered by a search query change
    // This prevents double fetching when search query changes
    if (searchQuery.trim() === '' || pagination.currentPage > 1) {
      fetchUsers(pagination.currentPage, pagination.pageSize, searchQuery);
    }
  }, [pagination.currentPage, pagination.pageSize]);

  const fetchUsers = async (page = 1, limit = 10, search = '') => {
    try {
      setLoading(true);
      const response = await api.get(`/api/users?page=${page}&limit=${limit}&search=${search}`);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
      setLoading(false);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.msg || 'Error fetching users');
      setLoading(false);
      
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/users/${userId}`);
      
      if (response.data.msg === 'User removed') {
        // Update total records count
        setPagination(prev => ({
          ...prev,
          totalRecords: response.data.totalRecords,
          totalPages: Math.ceil(response.data.totalRecords / prev.pageSize)
        }));
        
        // Check if we're on a page that no longer exists after deletion
        if (pagination.currentPage > Math.ceil(response.data.totalRecords / pagination.pageSize)) {
          // Go to the last available page
          fetchUsers(Math.ceil(response.data.totalRecords / pagination.pageSize), pagination.pageSize, searchQuery);
        } else {
          // Refresh the current page
          fetchUsers(pagination.currentPage, pagination.pageSize, searchQuery);
        }
        
        setError(''); // Clear any existing errors
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.msg || 'Error deleting user. Please try again.');
      
      // Handle specific error cases
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to delete users');
      }
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user._id);
    setFormData({
      username: user.username,
      email: user.email,
      phone: user.phone || '', 
      role: user.role,
      password: '' // Reset password field when editing
    });
    setError(''); // Clear any existing errors
  };

  const handleUpdate = async (userId) => {
    try {
      // Create update data without the password field
      const updateData = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        role: formData.role
      };
      
      const response = await api.put(`/api/users/${userId}`, updateData);
      setUsers(users.map(user => 
        user._id === userId ? response.data : user
      ));
      setEditingUser(null);
      setError(''); // Clear any existing errors
    } catch (err) {
      console.error('Update error:', err);
      setError(err.response?.data?.msg || 'Error updating user');
      
      if (err.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBack = () => {
    navigate('/admin');
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
    // Reset form data when showing the add user form
    if (!showAddForm) {
      setFormData({
        username: '',
        email: '',
        phone: '',
        role: 'user',
        password: ''
      });
    }
    setError('');
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/api/users', formData);
      
      // Update total records count
      setPagination(prev => ({
        ...prev,
        totalRecords: response.data.totalRecords,
        totalPages: Math.ceil(response.data.totalRecords / prev.pageSize)
      }));
      
      // Refresh user list after adding a new user
      fetchUsers(pagination.currentPage, pagination.pageSize, searchQuery);
      
      setShowAddForm(false);
      setError('');
      // Reset form data after successful creation
      setFormData({
        username: '',
        email: '',
        phone: '',
        role: 'user',
        password: ''
      });
    } catch (err) {
      console.error('Add user error:', err);
      setError(err.response?.data?.msg || 'Error adding user');
      
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to create users');
      }
    }
  };

  // Gmail-like navigation
  const handleNextPage = () => {
    if (pagination.currentPage < pagination.totalPages) {
      setPagination({
        ...pagination,
        currentPage: pagination.currentPage + 1
      });
    }
  };

  const handlePrevPage = () => {
    if (pagination.currentPage > 1) {
      setPagination({
        ...pagination,
        currentPage: pagination.currentPage - 1
      });
    }
  };

  const handlePageSizeChange = (e) => {
    const newPageSize = parseInt(e.target.value);
    setPagination({
      ...pagination,
      pageSize: newPageSize,
      currentPage: 1 // Reset to first page when changing page size
    });
  };

  // Handle search input changes with debounce
  const handleSearchChange = (e) => {
    const newSearchQuery = e.target.value;
    setSearchQuery(newSearchQuery);
    // Reset to first page is handled in the useEffect
  };

  // Function to clear search
  const clearSearch = () => {
    setSearchQuery('');
    // Reset to first page and fetch all users
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  // Function to highlight search term in text
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    // Convert to string in case of numbers
    const stringText = String(text);
    
    // If no search query, return original text
    if (!query.trim()) return stringText;
    
    try {
      // Create a regular expression to find all occurrences of the query (case insensitive)
      const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      
      // Split the text by the regex matches
      const parts = stringText.split(regex);
      
      // Map through parts and apply highlighting
      return parts.map((part, i) => {
        // If this part matches the query (case insensitive), highlight it
        if (part.toLowerCase() === query.toLowerCase()) {
          return (
            <span key={i} className="highlight-text">
              {part}
            </span>
          );
        }
        return part;
      });
    } catch (e) {
      console.error('Error highlighting text:', e);
      return stringText;
    }
  };

  return (
    <div className="user-management-container">
      <div className="header-actions">
        <h2>User Management</h2>
        <div className="action-buttons">
          <button onClick={handleBack} className="back-button">
            Back to Dashboard
          </button>
          <button onClick={toggleAddForm} className="add-user-button">
            {showAddForm ? 'Cancel' : 'Add User'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="add-user-form">
          <h3>Add New User</h3>
          <form onSubmit={handleAddUser}>
            <div className="form-group">
              <label>Username:</label>
              <input 
                type="text" 
                name="username" 
                value={formData.username} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Email:</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Phone:</label>
              <input 
                type="text" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
              />
            </div>
            <div className="form-group">
              <label>Password:</label>
              <input 
                type="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="form-group">
              <label>Role:</label>
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="create-button">Create User</button>
          </form>
        </div>
      )}

      {/* Search box */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
        {searchQuery && (
          <button onClick={clearSearch} className="clear-search-button">
            ✕
          </button>
        )}
      </div>

      {/* Add search status message when searching */}
      {searchQuery && !loading && (
        <div className="search-status">
          {pagination.totalRecords > 0 ? (
            <span>Found {pagination.totalRecords} results for "{searchQuery}"</span>
          ) : (
            <span>No results found for "{searchQuery}"</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      ) : (
        <div className="users-table-container">
          {/* Gmail-like pagination controls - top */}
          <div className="pagination-controls">
            <div className="page-size-selector">
              <span>Show</span>
              <select value={pagination.pageSize} onChange={handlePageSizeChange}>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>entries per page</span>
            </div>
            <div className="records-info">
              {pagination.totalRecords > 0 ? (
                <span>
                  {pagination.startRecord}-{pagination.endRecord} of {pagination.totalRecords}
                </span>
              ) : (
                <span>No records found</span>
              )}
            </div>
            <div className="navigation-arrows">
              <button 
                onClick={handlePrevPage}
                disabled={pagination.currentPage === 1}
                className="nav-arrow"
                aria-label="Previous Page"
              >
                &lt;
              </button>
              <button 
                onClick={handleNextPage}
                disabled={pagination.currentPage === pagination.totalPages}
                className="nav-arrow"
                aria-label="Next Page"
              >
                &gt;
              </button>
            </div>
          </div>

          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user._id} className={
                    searchQuery && 
                    (user.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                     (user.phone && user.phone.toLowerCase().includes(searchQuery.toLowerCase())) || 
                     user.role.toLowerCase().includes(searchQuery.toLowerCase())) 
                      ? "search-match-row" 
                      : ""
                  }>
                    <td>
                      {editingUser === user._id ? (
                        <input 
                          type="text" 
                          name="username" 
                          value={formData.username} 
                          onChange={handleChange} 
                        />
                      ) : highlightText(user.username, searchQuery)}
                    </td>
                    <td>
                      {editingUser === user._id ? (
                        <input 
                          type="email" 
                          name="email" 
                          value={formData.email} 
                          onChange={handleChange} 
                        />
                      ) : highlightText(user.email, searchQuery)}
                    </td>
                    <td>
                      {editingUser === user._id ? (
                        <input 
                          type="text" 
                          name="phone" 
                          value={formData.phone} 
                          onChange={handleChange} 
                        />
                      ) : highlightText(user.phone || 'N/A', searchQuery)}
                    </td>
                    <td>
                      {editingUser === user._id ? (
                        <select 
                          name="role" 
                          value={formData.role} 
                          onChange={handleChange}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : highlightText(user.role, searchQuery)}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="action-buttons">
                      {editingUser === user._id ? (
                        <div className="edit-actions">
                          <button onClick={() => handleUpdate(user._id)} className="save-button">Save</button>
                          <button onClick={() => setEditingUser(null)} className="cancel-button">Cancel</button>
                        </div>
                      ) : (
                        <div className="row-actions">
                          <button onClick={() => handleEdit(user)} className="edit-button">Edit</button>
                          <button onClick={() => handleDelete(user._id)} className="delete-button">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="no-records">No users found</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Gmail-like pagination controls - bottom (duplicated for convenience) */}
          <div className="pagination-controls bottom">
            <div className="page-indicator">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <div className="records-info">
              {pagination.totalRecords > 0 ? (
                <span>
                  {pagination.startRecord}-{pagination.endRecord} of {pagination.totalRecords}
                </span>
              ) : (
                <span>No records found</span>
              )}
            </div>
            <div className="navigation-arrows">
              <button 
                onClick={handlePrevPage}
                disabled={pagination.currentPage === 1}
                className="nav-arrow"
                aria-label="Previous Page"
              >
                &lt;
              </button>
              <button 
                onClick={handleNextPage}
                disabled={pagination.currentPage === pagination.totalPages}
                className="nav-arrow"
                aria-label="Next Page"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;