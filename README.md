# ☁️ Srri Drive

A full-stack personal cloud storage platform built with **React, Node.js, Express, and Azure Blob Storage**.  
Srri Drive provides secure file upload, preview, sharing, trash management, folders, and a Google Drive-style user experience.

---

## 🚀 Live Demo

🌐 **App:** https://drive.srrihari.app  
🔗 **Backend:** Azure App Service  
📦 **Storage:** Azure Blob Storage

---

## ✨ Features

- 🔐 Password-protected personal drive
- 📁 File and folder management
- ⬆️ Single and multiple file uploads
- 🖱️ Google Drive-style drag and drop upload
- 📥 Secure downloads using Azure SAS URLs
- 🔗 Public share links for individual files
- 🗑️ Trash, restore, and permanent delete
- 🔍 Search files
- ↕️ Sort by name, date, and size
- 🌙 Dark mode
- 🧱 Grid and list views
- 📊 Storage usage indicator
- 📱 Responsive UI

---

## 👀 File Preview Support

Srri Drive can preview many file types directly in the browser:

| Type | Preview |
|------|---------|
| Images | ✅ |
| PDF | ✅ |
| Code files | ✅ Syntax highlighting |
| Word documents | ✅ |
| Excel sheets | ✅ |
| PowerPoint files | ✅ |
| Videos | ✅ |
| Audio | ✅ |

---

## 🛠️ Tech Stack

### Frontend
- React
- Vite
- Axios
- CSS
- React Syntax Highlighter

### Backend
- Node.js
- Express.js
- Multer
- Azure Storage Blob SDK

### Cloud
- Azure Static Web Apps
- Azure App Service
- Azure Blob Storage
- Cloudflare DNS

---

## 🧩 Architecture

```txt
User
 │
 ▼
React Frontend
Azure Static Web Apps
 │
 ▼
Express Backend
Azure App Service
 │
 ▼
Azure Blob Storage
Private Container
