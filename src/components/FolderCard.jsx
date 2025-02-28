import React from "react";
import axios from "axios";

const FolderCard = ({ folder, isAdmin, fetchFolders }) => {
    const handleDeleteImage = async (image) => {
        try {
            await axios.delete(`http://localhost:5000/api/folder/${folder._id}/image`, {
                data: { image },
                headers: { Authorization: localStorage.getItem("token") },
            });
            fetchFolders();
        } catch (error) {
            console.error("Error deleting image:", error);
        }
    };

    const handleDisableFolder = async () => {
        try {
            await axios.put(`http://localhost:5000/api/folder/${folder._id}/disable`, {}, {
                headers: { Authorization: localStorage.getItem("token") },
            });
            fetchFolders();
        } catch (error) {
            console.error("Error disabling folder:", error);
        }
    };

    return (
        <div>
            <h2>{folder.name}</h2>
            <div>
                {folder.images.map((img, index) => (
                    <div key={index}>
                        <img src={`http://localhost:5000/uploads/${img}`} alt="Uploaded" width="100" />
                        {isAdmin && (
                            <button onClick={() => handleDeleteImage(img)}>Delete Image</button>
                        )}
                    </div>
                ))}
            </div>

            {isAdmin && (
                <div>
                    <button onClick={handleDisableFolder}>Disable Folder</button>
                </div>
            )}
        </div>
    );
};

export default FolderCard;
