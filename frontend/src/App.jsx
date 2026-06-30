import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { IoMdTime } from "react-icons/io";
import { IoTrashBin } from "react-icons/io5";

const API =
  "https://srribackend-gjhpafapfjgcbgfx.southindia-01.azurewebsites.net/";

function getKind(name) {
  const ext = name.split(".").pop()?.toLowerCase();

  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "Image";
  if (["pdf"].includes(ext)) return "PDF document";

  if (["zip", "rar"].includes(ext)) return "Archive";
  if (["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext))
    return "Office document";
  if (
    [
      "js",
      "jsx",
      "ts",
      "tsx",
      "py",
      "cpp",
      "c",
      "html",
      "css",
      "json",
    ].includes(ext)
  )
    return "Code";
  if (["mp4", "mov", "webm"].includes(ext)) return "Video";
  if (["mp3", "wav", "flac", "aac", "m4a"].includes(ext)) return "Audio";
  return "File";
}

function getIcon(name) {
  const kind = getKind(name);

  if (kind === "Image") return "🖼️";
  if (kind === "PDF document") return "📕";
  if (kind === "Video") return "🎞️";
  if (kind === "Word document") return "📘";
  if (kind === "Spreadsheet") return "📗";
  if (kind === "Archive") return "🗜️";

  return "📄";
}

function formatSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTotalSize(files) {
  return files.reduce((total, file) => total + (file.size || 0), 0);
}

function PublicSharePage({ shareId }) {
  const [file, setFile] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    axios
      .get(`${API}/share/${shareId}`)
      .then((res) => {
        setFile(res.data);
      })
      .catch((err) => {
        console.error(err);
        setFile({ error: "Shared file not found or backend unavailable." });
      });
  }, [shareId]);

  if (!file) {
    return <div className="sharePage">Loading shared file...</div>;
  }

  if (file?.error) {
    return <div className="sharePage">{file.error}</div>;
  }

  return (
    <div className="sharePage">
      <div className="shareBox">
        <h1 style={{ display: "flex", justifyContent: "center", margin: 0 }}>
          <img src="/logo.png" alt="" width={"100px"} />
        </h1>
        <h2>{file.fileName.replace(/^\d+-/, "")}</h2>

        {getKind(file.fileName) === "Image" ? (
          <>
            <div className="imageToolbar">
              <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}>
                −
              </button>

              <span>{Math.round(zoom * 100)}%</span>

              <button onClick={() => setZoom((z) => Math.min(8, z + 0.2))}>
                +
              </button>

              <button
                onClick={() => {
                  setZoom(1);
                  setPosition({ x: 0, y: 0 });
                }}
              >
                Reset
              </button>
            </div>

            <div
              className="imageViewer shareImageViewer"
              onWheel={(e) => {
                e.preventDefault();
                setZoom((z) =>
                  e.deltaY < 0 ? Math.min(z + 0.1, 8) : Math.max(z - 0.1, 0.2),
                );
              }}
              onMouseDown={(e) => {
                setDragging(true);
                setStartPos({
                  x: e.clientX - position.x,
                  y: e.clientY - position.y,
                });
              }}
              onMouseMove={(e) => {
                if (!dragging) return;
                setPosition({
                  x: e.clientX - startPos.x,
                  y: e.clientY - startPos.y,
                });
              }}
              onMouseUp={() => setDragging(false)}
              onMouseLeave={() => setDragging(false)}
            >
              <img
                src={file.url}
                alt={file.fileName}
                draggable={false}
                className="previewImage"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                }}
              />
            </div>
          </>
        ) : (
          <iframe
            className="sharePreview"
            src={file.url}
            title={file.fileName}
          />
        )}

        <a href={file.url} target="_blank" rel="noopener noreferrer">
          Download File
        </a>
      </div>
    </div>
  );
}

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState("");
  const [folders, setFolders] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [search, setSearch] = useState("");
  const [secret, setSecret] = useState(localStorage.getItem("secret") || "");
  const [password, setPassword] = useState("");
  const [view, setView] = useState("recents");
  const [sortBy, setSortBy] = useState("date");
  const [layout, setLayout] = useState("list");
  const [darkMode, setDarkMode] = useState(false);
  const [favorites, setFavorites] = useState(
    JSON.parse(localStorage.getItem("favorites")) || [],
  );
  const [codeContent, setCodeContent] = useState("");
  const [zoom, setZoom] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const toggleFavorite = (name) => {
    const updated = favorites.includes(name)
      ? favorites.filter((item) => item !== name)
      : [...favorites, name];

    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
  };

  const config = {
    headers: {
      "x-app-secret": secret,
    },
  };

  const login = async () => {
    try {
      const res = await axios.post(`${API}/login`, { password });

      localStorage.setItem("secret", res.data.secret);
      setSecret(res.data.secret);
    } catch (err) {
      alert("Wrong password");
    }
  };

  const renameFile = async (oldName) => {
    const cleanOldName = oldName.replace(/^\d+-/, "");
    const newName = prompt("Enter new file name", cleanOldName);

    if (!newName) return;

    await axios.put(
      `${API}/rename`,
      {
        oldName,
        newName: `${Date.now()}-${newName}`,
      },
      config,
    );

    loadFiles();
  };

  const openPreview = async (file) => {
    // Reset viewer every time a new file is opened
    setZoom(1);
    setPosition({ x: 0, y: 0 });

    const url = await getSecureUrl(file.name);

    if (getKind(file.name) === "Code") {
      const res = await fetch(url);
      const text = await res.text();
      setCodeContent(text);
    }

    setPreviewFile({
      ...file,
      previewUrl: url,
    });
  };

  const loadFiles = async () => {
    const res = await axios.get(`${API}/files`, config);
    const allFiles = res.data;

    setFiles(allFiles);

    const folderList = allFiles
      .filter((file) => file.name.endsWith("/.folder"))
      .map((file) => file.name.replace("/.folder", ""));

    setFolders(folderList);
  };

  const uploadFiles = async (fileList) => {
    const filesArray = Array.from(fileList);

    setUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", currentFolder);

      await axios.post(`${API}/upload`, formData, config);

      setUploadProgress(Math.round(((i + 1) / filesArray.length) * 100));
    }

    setUploading(false);
    setUploadProgress(0);
    loadFiles();
  };

  const deleteFile = async (name) => {
    if (!confirm("Delete this file?")) return;
    await axios.delete(`${API}/delete/${encodeURIComponent(name)}`, config);
    loadFiles();
  };

  const filteredFiles = files
    .filter((file) => {
      const isTrash = file.name.startsWith("trash/");

      if (view === "trash" && !isTrash) return false;
      if (view === "recents" && isTrash) return false;

      // Hide placeholder file
      if (file.name.endsWith("/.folder")) return false;

      const inFolder = currentFolder
        ? file.name.startsWith(currentFolder + "/")
        : true;

      return inFolder && file.name.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return (b.size || 0) - (a.size || 0);
      return new Date(b.uploadedAt) - new Date(a.uploadedAt);
    });

  const shareFile = async (fileName) => {
    const res = await axios.post(`${API}/share`, { fileName }, config);

    await navigator.clipboard.writeText(res.data.url);
    alert("Share link copied:\n" + res.data.url);
  };

  const logout = () => {
    localStorage.removeItem("secret");
    setSecret("");
    setFiles([]);
  };

  const emptyTrash = async () => {
    if (!confirm("Delete all files in trash permanently?")) return;
    await axios.delete(`${API}/empty-trash`, config);
    loadFiles();
  };

  const getSecureUrl = async (name) => {
    const res = await axios.get(
      `${API}/secure-url/${encodeURIComponent(name)}`,
      config,
    );

    return res.data.url;
  };

  const restoreFile = async (trashName) => {
    await axios.put(`${API}/restore`, { trashName }, config);
    loadFiles();
  };

  const permanentDelete = async (name) => {
    if (!confirm("Permanently delete this file?")) return;
    await axios.delete(
      `${API}/permanent-delete/${encodeURIComponent(name)}`,
      config,
    );
    loadFiles();
  };

  useEffect(() => {
    if (secret) {
      loadFiles();
    }
  }, [secret]);

  const isSharePage = window.location.pathname.startsWith("/share/");
  const shareId = window.location.pathname.split("/share/")[1];

  if (isSharePage) {
    return <PublicSharePage shareId={shareId} />;
  }

  if (!secret) {
    return (
      <div className="icloudLoginPage">
        <div className="icloudLoginCard">
          <div className="icloudOrb">
            <div className="icloudLogo">
              <img src="/logo.png" alt="Srri Drive" />
            </div>
          </div>

          <h1>Sign in to Srri Drive</h1>

          <input
            className="icloudInput"
            type="password"
            placeholder="Enter Drive Password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
          />

          <button
            className="icloudContinue"
            onClick={login}
            disabled={!password}
          >
            Continue
          </button>

          <p className="icloudInfo">
            Your Srri Drive password is used to securely unlock your personal
            cloud storage and access your files, previews, folders, and shared
            links.
          </p>

          <div className="icloudButtons">
            <button
              className="icloudPrimary"
              onClick={login}
              disabled={!password}
            >
              Continue
            </button>

            <button className="icloudDarkBtn" disabled>
              ☁️ Srri Drive
            </button>
          </div>

          <p className="icloudFooterText">
            Secure personal cloud powered by Azure Blob Storage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={darkMode ? "app dark" : "app"}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
    >
      {isDragging && (
        <div
          className="dragOverlay"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => {
            if (e.clientX <= 0 || e.clientY <= 0) {
              setIsDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            uploadFiles(e.dataTransfer.files);
          }}
        >
          <div className="dragTopText">
            Drop here to upload, share, move, or do more
          </div>

          <div className="dragCenter">
            <div className="cloudIcon">☁️</div>
            <div className="dragBubble">
              Drop files to upload them to
              <br />
              <b>{currentFolder || "My Drive"}</b>
            </div>
          </div>
        </div>
      )}
      <aside className="sidebar">
        <h2 style={{ display: "flex", justifyContent: "center", margin: 0 }}>
          <img src="/logo.png" alt="" width={"100px"} />
        </h2>
        <button
          onClick={logout}
          className="logoutBtn"
          style={{
            border: "none",
            background: "#ff3b30",
            color: "white",
            padding: "9px 14px",
            borderRadius: "10px",
            cursor: "pointer",
            margin: "8px 6px 16px",
          }}
        >
          Logout
        </button>
        <div className="storageBox">
          <p>{formatSize(getTotalSize(files))} used</p>
          <div className="storageBar">
            <div
              className="storageFill"
              style={{
                width: `${Math.min((getTotalSize(files) / (1024 * 1024 * 1024)) * 100, 100)}%`,
              }}
            ></div>
          </div>
          <small>of 1 GB</small>
        </div>

        <nav>
          <button
            className={view === "recents" ? "active" : ""}
            onClick={() => setView("recents")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <IoMdTime style={{ color: "blue" }} /> Recents
          </button>

          <button
            className={view === "trash" ? "active" : ""}
            onClick={() => setView("trash")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <IoTrashBin style={{ color: "blue" }} /> Recently Deleted
          </button>
        </nav>

        <p className="favTitle">Favorites</p>
        <button className="sideItem">📂 Downloads</button>
      </aside>

      <main className="main">
        {view === "trash" && (
          <button className="dangerBtn" onClick={emptyTrash}>
            Empty Trash
          </button>
        )}
        <header className="topbar">
          <button
            className="createFolderBtn"
            onClick={async () => {
              const folderName = prompt("Folder name");
              if (!folderName) return;

              await axios.post(`${API}/create-folder`, { folderName }, config);

              loadFiles();
            }}
          >
            + Folder
          </button>
          <div>
            <h1>{view === "trash" ? "Recently Deleted" : "Recents"}</h1>
            <p>
              {filteredFiles.length} items, {formatSize(getTotalSize(files))}{" "}
              used
            </p>
          </div>

          <div className="actions">
            <label className="uploadBtn">
              ☁️ Upload
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => uploadFiles(e.target.files)}
              />
            </label>
            <button className="viewBtn" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>

            <button
              className="viewBtn"
              onClick={() => setLayout(layout === "list" ? "grid" : "list")}
            >
              {layout === "list" ? "▦ Grid" : "☰ List"}
            </button>

            <select
              className="sortSelect"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>

            <input
              className="search"
              placeholder="Search Drive"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {/* <div
          className="dropArea"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            uploadFiles(e.dataTransfer.files);
          }}
        >
          Drag & drop files here
        </div> */}

        {uploading && (
          <div className="progressBox">
            <p>Uploading... {uploadProgress}%</p>
            <div className="progressBar">
              <div
                className="progressFill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {currentFolder && (
          <button className="backBtn" onClick={() => setCurrentFolder("")}>
            ← Back to Drive
          </button>
        )}
        <section className={layout === "grid" ? "gridView" : "table"}>
          <div className="tableHead">
            <span>Name</span>
            <span>Kind</span>
            <span>Size</span>
            <span>Date</span>
            <span>Action</span>
          </div>

          {view === "recents" &&
            !currentFolder &&
            folders.map((folder) => (
              <div className="fileRow" key={folder}>
                <div className="fileName">
                  <span className="icon">📁</span>
                  <button
                    className="fileOpenBtn"
                    onClick={() => setCurrentFolder(folder)}
                  >
                    {folder}
                  </button>
                </div>
                <span>Folder</span>
                <span>-</span>
                <span>-</span>
                <span>-</span>
              </div>
            ))}

          {filteredFiles.map((file) => (
            <div className="fileRow" key={file.name}>
              <div className="fileName">
                {getKind(file.name) === "Image" ? (
                  <img
                    className="thumb"
                    src={`${API}/download/${encodeURIComponent(file.name)}`}
                    alt={file.name}
                  />
                ) : (
                  <span className="icon">{getIcon(file.name)}</span>
                )}
                <button
                  className="fileOpenBtn"
                  onClick={() => openPreview(file)}
                >
                  {file.name.replace(/^\d+-/, "")}
                </button>
              </div>

              <span>{getKind(file.name)}</span>
              <span>{formatSize(file.size)}</span>
              <span>
                {file.uploadedAt
                  ? new Date(file.uploadedAt).toLocaleDateString()
                  : "-"}
              </span>

              <div className="rowActions">
                {view === "trash" ? (
                  <>
                    <button onClick={() => restoreFile(file.name)}>
                      Restore
                    </button>
                    <button onClick={() => permanentDelete(file.name)}>
                      Delete Forever
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => shareFile(file.name)}>Share</button>
                    <button
                      onClick={async () => {
                        const url = await getSecureUrl(file.name);
                        window.open(url, "_blank");
                      }}
                    >
                      Download
                    </button>
                    <button onClick={() => renameFile(file.name)}>
                      Rename
                    </button>
                    <button onClick={() => deleteFile(file.name)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </section>
        {previewFile && (
          <div className="modalOverlay" onClick={() => setPreviewFile(null)}>
            <div className="previewModal" onClick={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <h3>{previewFile.name.replace(/^\d+-/, "")}</h3>
                <button onClick={() => setPreviewFile(null)}>✕</button>
              </div>

              {getKind(previewFile.name) === "Image" && (
                <>
                  <div className="imageToolbar">
                    <button
                      onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))}
                    >
                      −
                    </button>

                    <span>{Math.round(zoom * 100)}%</span>

                    <button onClick={() => setZoom((z) => z + 0.2)}>+</button>

                    <button
                      onClick={() => {
                        setZoom(1);
                        setPosition({ x: 0, y: 0 });
                      }}
                    >
                      Reset
                    </button>
                  </div>

                  <div
                    className="imageViewer"
                    onWheel={(e) => {
                      e.preventDefault();

                      if (e.deltaY < 0) setZoom((z) => Math.min(z + 0.1, 8));
                      else setZoom((z) => Math.max(z - 0.1, 0.2));
                    }}
                    onMouseDown={(e) => {
                      setDragging(true);
                      setStartPos({
                        x: e.clientX - position.x,
                        y: e.clientY - position.y,
                      });
                    }}
                    onMouseMove={(e) => {
                      if (!dragging) return;

                      setPosition({
                        x: e.clientX - startPos.x,
                        y: e.clientY - startPos.y,
                      });
                    }}
                    onMouseUp={() => setDragging(false)}
                    onMouseLeave={() => setDragging(false)}
                  >
                    <img
                      src={previewFile.previewUrl}
                      alt={previewFile.name}
                      draggable={false}
                      className="previewImage"
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom || 1})`,
                      }}
                    />
                  </div>
                </>
              )}

              {getKind(previewFile.name) === "PDF document" && (
                <iframe
                  className="previewFrame"
                  src={previewFile.previewUrl}
                  title={previewFile.name}
                />
              )}

              {getKind(previewFile.name) === "Code" && (
                <SyntaxHighlighter
                  language={previewFile.name.split(".").pop()}
                  style={oneLight}
                  showLineNumbers
                  wrapLongLines
                >
                  {codeContent}
                </SyntaxHighlighter>
              )}

              {getKind(previewFile.name) === "Office document" && (
                <iframe
                  className="previewFrame"
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                    previewFile.previewUrl,
                  )}`}
                  title={previewFile.name}
                />
              )}

              {getKind(previewFile.name) === "Video" && (
                <video controls className="previewVideo">
                  <source src={previewFile.previewUrl} />
                  Your browser does not support video playback.
                </video>
              )}

              {getKind(previewFile.name) === "Audio" && (
                <div className="audioPreview">
                  <div className="audioIcon">🎵</div>
                  <h2>{previewFile.name.replace(/^\d+-/, "")}</h2>

                  <audio controls className="previewAudio">
                    <source src={previewFile.previewUrl} />
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {![
                "Image",
                "PDF document",
                "Code",
                "Office document",
                "Video",
                "Audio",
              ].includes(getKind(previewFile.name)) && (
                <div className="noPreview">
                  Preview not available for this file type.
                  <br />
                  <a
                    href={previewFile.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download file
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
