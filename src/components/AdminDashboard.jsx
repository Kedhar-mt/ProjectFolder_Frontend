import { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "../styles/AdminDashboard.css";
import api from "../utils/api";
import { handleLogout } from '../utils/api';
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [folderName, setFolderName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState({});
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState(null);
  const [editingImage, setEditingImage] = useState(null);
  const [newImageName, setNewImageName] = useState("");
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState(null);
  const [folderUpload, setFolderUpload] = useState(null);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await api.get("/api/folder");
      setFolders(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching folders:", err);
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  const createFolder = async () => {
    try {
      const response = await api.post("/api/folder/create", {
        name: folderName,
      });
      setFolders([...folders, response.data.folder]);
      setFolderName("");
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  const handleFileSelect = (folderId, files) => {
    setSelectedFiles({
      ...selectedFiles,
      [folderId]: Array.from(files),
    });
  };

  const handleFolderSelect = (e) => {
    const directory = e.target.files;
    setFolderUpload(directory);
  };

const handleFolderUpload = async (folderId) => {
    if (!folderUpload || folderUpload.length === 0) {
        setError("Please select a folder to upload");
        return;
    }

    setUploading({ ...uploading, [folderId]: true });
    setError(null);

    try {
        const formData = new FormData();
        Array.from(folderUpload).forEach((file) => {
            formData.append("images", file);
        });

        // Split data into chunks (dynamic sizing based on total records)
        const totalFiles = Array.from(folderUpload).length;
        const chunkSize = totalFiles <= 200 ? 50 : 
                          totalFiles <= 500 ? 100 : 
                          totalFiles <= 1000 ? 150 : 200;
        
        const chunks = [];
        for (let i = 0; i < totalFiles; i += chunkSize) {
            chunks.push(Array.from(folderUpload).slice(i, i + chunkSize));
        }

        console.log(`Processing ${totalFiles} files in ${chunks.length} chunks of ~${chunkSize} each`);

        // Create an array of promises for each chunk upload
        const uploadPromises = chunks.map((chunk, index) => {
            const chunkFormData = new FormData();
            chunk.forEach((file) => {
                chunkFormData.append("images", file);
            });

            return api.post(`/api/folder/upload/${folderId}`, chunkFormData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            })
            .then(response => {
                console.log(`Batch ${index + 1} complete:`, response.data);
                return {
                    status: "fulfilled",
                    value: response.data,
                    chunkIndex: index
                };
            })
            .catch(error => {
                console.error(`Error uploading batch ${index + 1}:`, error);
                return {
                    status: "rejected",
                    reason: error.response?.data?.message || "Upload error",
                    chunkIndex: index
                };
            });
        });

        // Set status to indicate parallel processing
        setUploading({ ...uploading, [folderId]: true });

        // Use Promise.allSettled to handle all chunks in parallel
        const results = await Promise.allSettled(uploadPromises);

        let overallResults = {
            successful: 0,
            failedChunks: 0
        };

        results.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value.status !== "rejected") {
                overallResults.successful++;
            } else {
                overallResults.failedChunks++;
                console.error(`Chunk ${index + 1} failed:`, result.reason || result.value?.reason);
            }
        });

        // Customize message based on results
        let resultMessage = "";
        if (overallResults.failedChunks > 0) {
            resultMessage = `Upload partially complete. Uploaded ${overallResults.successful} chunks successfully. ${overallResults.failedChunks} batch(es) failed.`;
        } else if (overallResults.successful > 0) {
            resultMessage = `Success! Uploaded all ${overallResults.successful} chunks successfully.`;
        }

        setError(overallResults.failedChunks > 0 ? "warning" : null);
        setUploading({ ...uploading, [folderId]: false });
        setFolderUpload(null);
        await fetchFolders();

    } catch (err) {
        setError(err.response?.data?.message || "An error occurred");
        setUploading({ ...uploading, [folderId]: false });
    }
};

const handleFileUpload = async (folderId) => {
    if (!selectedFiles[folderId] || selectedFiles[folderId].length === 0) {
      setError("Please select files to upload");
      return;
    }
  
    setUploading((prev) => ({ ...prev, [folderId]: true }));
    setUploadProgress((prev) => ({ ...prev, [folderId]: 0 }));
    setError(null);
  
    try {
      const filesArray = selectedFiles[folderId];
      const totalFiles = filesArray.length;
  
      // Dynamic batch size based on total files
      const BATCH_SIZE = Math.ceil(totalFiles / 3) || 1; // Ensuring at least 1 file per batch
      const totalBatches = Math.ceil(totalFiles / BATCH_SIZE);
  
      for (let i = 0; i < totalBatches; i++) {
        const batch = filesArray.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
  
        const formData = new FormData();
        batch.forEach((file) => formData.append("images", file));
  
        await api.post(`/api/folder/upload/${folderId}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress((prev) => ({ ...prev, [folderId]: percentCompleted }));
          },
        });
      }
  
      setSelectedFiles((prev) => ({ ...prev, [folderId]: [] }));
      await fetchFolders();
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    } finally {
      setUploading((prev) => ({ ...prev, [folderId]: false }));
    }
  };

  const handleEditImageName = (folderId, imageId, currentName) => {
    setEditingImage({ folderId, imageId });
    setNewImageName(currentName);
  };

  const handleEditFolderName = (folderId, currentName) => {
    setEditingFolder(folderId);
    setNewFolderName(currentName);
  };

  const handleDeleteImage = async (folderId, imagePath) => {
    try {
      const response = await api.delete(`/api/folder/${folderId}/image`, {
        data: { imagePath },
      });

      if (response.data.folderDeleted) {
        setFolders(folders.filter((folder) => folder._id !== folderId));
      } else {
        await fetchFolders();
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  const saveImageName = async (folderId, imageId) => {
    try {
      await api.put(`/api/folder/${folderId}/image/${imageId}`, {
        newName: newImageName,
      });

      setEditingImage(null);
      setNewImageName("");
      await fetchFolders();
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  const saveFolderName = async (folderId) => {
    try {
      await api.put(`/api/folder/${folderId}`, {
        newName: newFolderName,
      });
      setEditingFolder(null);
      setNewFolderName("");
      await fetchFolders();
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      await api.delete(`/api/folder/${folderId}`);
      setFolders(folders.filter((folder) => folder._id !== folderId));
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  const toggleFolder = async (id) => {
    try {
      const response = await api.put(`/api/folder/disable/${id}`);
      if (response.data) {
        await fetchFolders();
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
    }
  };

  const validateUserData = (user, index) => {
    const errors = [];

    // Username validation
    if (
      !user.username ||
      user.username.length < 3 ||
      user.username.length > 50
    ) {
      errors.push(
        `Row ${index + 1}: Username must be between 3 and 50 characters`
      );
    }

    // Email validation
    if (!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
      errors.push(`Row ${index + 1}: Invalid email format`);
    }

    // Password validation
    if (!user.password || user.password.length < 8) {
      errors.push(
        `Row ${index + 1}: Password must be at least 8 characters long`
      );
    }

    // Phone validation
    if (!user.phone) {
      errors.push(`Row ${index + 1}: Phone number is required`);
    }

    return errors;
  };

  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel"
      ) {
        setExcelFile(file);
        setUploadStatus(null);
        setUploadProgress(0);
      } else {
        setUploadStatus({
          type: "error",
          message: "Please upload only Excel files (.xlsx or .xls)",
        });
      }
    }
  };

 const handleExcelUpload = async () => {
    if (!excelFile) {
      setUploadStatus({
        type: "error",
        message: "Please select an Excel file first",
      });
      return;
    }
  
    try {
      setUploadProgress(10);
      const reader = new FileReader();
  
      reader.onload = async (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: "binary" });
          setUploadProgress(20);
  
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });
          setUploadProgress(30);
  
          console.log("Parsed Excel Data:", jsonData);
  
          // Process and validate all data first
          const validationErrors = [];
          const processedUsers = jsonData.map((row, index) => {
            const user = {
              username: String(row.username || "").trim(),
              email: String(row.email || "").trim().toLowerCase(),
              password: String(row.password || "").trim(),
              phone: String(row.phone || "").trim(),
              role: "user",
            };
  
            const errors = validateUserData(user, index);
            if (errors.length > 0) {
              validationErrors.push(...errors);
            }
  
            return user;
          });
  
          if (validationErrors.length > 0) {
            setUploadStatus({
              type: "error",
              message: "Validation errors:",
              details: validationErrors,
            });
            setUploadProgress(0);
            return;
          }
  
          // Split data into chunks (dynamic sizing based on total records)
          const totalRecords = processedUsers.length;
          // Choose chunk size based on record count
          const chunkSize = totalRecords <= 200 ? 50 : 
                           totalRecords <= 500 ? 100 : 
                           totalRecords <= 1000 ? 150 : 200;
          
          const chunks = [];
          for (let i = 0; i < processedUsers.length; i += chunkSize) {
            chunks.push(processedUsers.slice(i, i + chunkSize));
          }
  
          setUploadProgress(40);
          console.log(`Processing ${totalRecords} records in ${chunks.length} chunks of ~${chunkSize} each`);
  
          // Create an array of promises for each chunk upload
          const uploadPromises = chunks.map((chunk, index) => {
            return api.post("/api/folder/users/upload", chunk)
              .then(response => {
                console.log(`Batch ${index + 1} complete:`, response.data.results);
                return {
                  status: "fulfilled",
                  value: response.data.results,
                  chunkIndex: index
                };
              })
              .catch(error => {
                console.error(`Error uploading batch ${index + 1}:`, error);
                return {
                  status: "rejected",
                  reason: error.response?.data?.message || "Upload error",
                  chunkIndex: index
                };
              });
          });
  
          // Set status to indicate parallel processing
          setUploadStatus({
            type: "info",
            message: `Processing ${chunks.length} batches in parallel...`,
          });
          
          // Use Promise.allSettled to handle all chunks in parallel
          const results = await Promise.allSettled(uploadPromises);
          
          // Process results from all chunks
          let overallResults = {
            successful: 0,
            skipped: 0,
            skippedUsers: [],
            failedChunks: 0
          };
          
          results.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value.status !== "rejected") {
              // Extract results from this chunk
              const chunkResults = result.value;
              overallResults.successful += chunkResults.successful || 0;
              overallResults.skipped += chunkResults.skipped || 0;
              
              // Add skipped users if available
              if (chunkResults.skippedUsers && Array.isArray(chunkResults.skippedUsers)) {
                overallResults.skippedUsers = [
                  ...overallResults.skippedUsers,
                  ...chunkResults.skippedUsers
                ];
              }
            } else {
              // This chunk failed
              overallResults.failedChunks++;
              console.error(`Chunk ${index + 1} failed:`, result.reason || result.value?.reason);
            }
          });
  
          // Final results - improved messaging for mixed existing/new users scenario
          setUploadProgress(100);
          
          // Customize message based on results
          let resultMessage = "";
          if (overallResults.failedChunks > 0) {
            resultMessage = `Upload partially complete. Added ${overallResults.successful} new users. ${overallResults.skipped} existing users were skipped. ${overallResults.failedChunks} batch(es) failed.`;
          } else if (overallResults.successful > 0 && overallResults.skipped > 0) {
            resultMessage = `Upload complete! Added ${overallResults.successful} new users. ${overallResults.skipped} existing users were skipped.`;
          } else if (overallResults.successful > 0) {
            resultMessage = `Success! Added all ${overallResults.successful} new users.`;
          } else if (overallResults.skipped > 0) {
            resultMessage = `No new users added. All ${overallResults.skipped} users already exist in the system.`;
          }
          
          setUploadStatus({
            type: overallResults.failedChunks > 0 ? "warning" : "success",
            message: resultMessage,
            details: overallResults.skippedUsers.length > 0 && overallResults.skippedUsers.length <= 50
              ? overallResults.skippedUsers.map(u => `Skipped: ${u.username || "Unknown"} - ${u.reason}`)
              : overallResults.skippedUsers.length > 50 
                ? [`${overallResults.skippedUsers.length} users were skipped. Most were already in the system.`] 
                : null
          });
          
          setExcelFile(null);
          
          // Reset file input
          const fileInput = document.getElementById("excel-upload");
          if (fileInput) fileInput.value = "";
          
        } catch (error) {
          console.error("Error processing Excel:", error);
          setUploadStatus({
            type: "error",
            message: error.message || "Error processing Excel file. Please check the format.",
          });
          setUploadProgress(0);
        }
      };
  
      reader.readAsBinaryString(excelFile);
    } catch (error) {
      console.error("Error uploading Excel:", error);
      setUploadStatus({
        type: "error",
        message: error.message || "Error uploading file. Please try again.",
      });
      setUploadProgress(0);
    }
  };
  
  const handleViewUsers = () => {
    navigate('/admin/users');
  };

  return (
    <div className="admin-dashboard">
      <h2 className="dashboard-title">Admin Dashboard</h2>
      <div className="action-buttons">
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
        <button onClick={handleViewUsers} className="view-users-button">
          View Users
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {/* Create Folder Section */}
      <div className="create-folder-section">
        <input
          type="text"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder="Folder Name"
          className="folder-input"
        />
        <button onClick={createFolder} className="create-button">
          Create Folder
        </button>
      </div>
      
      {/* Bulk User Registration */}
      <div className="user-registration-section">
        <h3 className="section-title">Bulk User Registration</h3>

        <div className="excel-uploader">
          <div className="excel-input-container">
            <label>Upload Excel File (.xlsx, .xls)</label>
            <p>Excel columns should be: username, phone, email, password</p>
            <input
              id="excel-upload"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleExcelFileChange}
              className="file-input"
            />
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          {uploadStatus && (
            <div className={`status-message ${uploadStatus.type}`}>
              <p>{uploadStatus.message}</p>
              {uploadStatus.details && (
                <ul className="error-list">
                  {uploadStatus.details.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            onClick={handleExcelUpload}
            disabled={!excelFile || (uploadProgress > 0 && uploadProgress < 100)}
            className="upload-excel-button"
          >
            {uploadProgress > 0 && uploadProgress < 100
              ? "Uploading..."
              : "Upload Excel"}
          </button>
        </div>
      </div>
      
      {/* Folders List */}
      <div className="folders-list">
        {folders.map((folder) => (
          <div key={folder._id} className="folder-item">
            {editingFolder === folder._id ? (
              <div className="folder-edit">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="folder-edit-input"
                />
                <button 
                  onClick={() => saveFolderName(folder._id)}
                  className="save-button"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="folder-header">
                <h3 className="folder-name">
                  {folder.name}
                  {folder.isDisabled && (
                    <span className="folder-disabled-label">
                      (Disabled - Only visible to admin)
                    </span>
                  )}
                </h3>
                <div className="folder-actions">
                  <button 
                    onClick={() => handleEditFolderName(folder._id, folder.name)}
                    className="edit-button"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteFolder(folder._id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                  <button 
                    onClick={() => toggleFolder(folder._id)}
                    className={folder.isDisabled ? "enable-button" : "disable-button"}
                  >
                    {folder.isDisabled ? "Enable" : "Disable"}
                  </button>
                </div>
              </div>
            )}

            <div className="folder-content">
              {/* Folder Upload Section */}
              <div className="folder-upload-section">
                <h4 className="section-subtitle">Upload Folder</h4>
                <div className="upload-controls">
                  <input
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderSelect}
                    disabled={uploading[folder._id]}
                    className="file-input"
                  />
                  <button
                    onClick={() => handleFolderUpload(folder._id)}
                    disabled={uploading[folder._id] || !folderUpload}
                    className="upload-folder-button"
                  >
                    {uploading[folder._id] ? "Uploading Folder..." : "Upload Folder"}
                  </button>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="file-upload-section">
                <h4 className="section-subtitle">Upload Images</h4>
                <div className="upload-controls">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileSelect(folder._id, e.target.files)}
                    disabled={uploading[folder._id]}
                    className="file-input"
                  />
                  <button
                    onClick={() => handleFileUpload(folder._id)}
                    disabled={uploading[folder._id] || !selectedFiles[folder._id]?.length}
                    className="upload-button"
                  >
                    {uploading[folder._id] ? "Uploading..." : "Upload Images"}
                  </button>
                </div>
                
                {selectedFiles[folder._id]?.length > 0 && (
                  <div className="selected-files-info">
                    Selected files: {selectedFiles[folder._id].length}
                  </div>
                )}

                {uploadProgress[folder._id] > 0 && (
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar"
                      style={{ width: `${uploadProgress[folder._id]}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Images Grid */}
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
                      {editingImage?.imageId === image._id ? (
                        <div className="image-edit">
                          <input
                            type="text"
                            value={newImageName}
                            onChange={(e) => setNewImageName(e.target.value)}
                            placeholder="New name"
                            className="image-name-input"
                          />
                          <div className="edit-actions">
                            <button 
                              onClick={() => saveImageName(folder._id, image._id)}
                              className="save-button"
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingImage(null)}
                              className="cancel-button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="image-info">
                          <p className="image-name">{image.name}</p>
                          <div className="image-actions">
                            <button 
                              onClick={() => handleEditImageName(folder._id, image._id, image.name)}
                              className="edit-button"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteImage(folder._id, image.path)}
                              className="delete-button"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
