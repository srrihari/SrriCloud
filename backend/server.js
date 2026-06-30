const express = require("express");
const cors = require("cors");
const multer = require("multer");
const dotenv = require("dotenv");

const { v4: uuidv4 } = require("uuid");
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require("@azure/storage-blob");

const protect = (req, res, next) => {
  const key = req.headers["x-app-secret"];

  if (key !== process.env.APP_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

dotenv.config();

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://nice-glacier-091f23d10.7.azurestaticapps.net",
      "https://drive.srrihari.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING,
);

const containerClient = blobServiceClient.getContainerClient(
  process.env.AZURE_CONTAINER_NAME,
);

const SHARES_BLOB = "metadata/shares.json";

async function readShares() {
  const blobClient = containerClient.getBlobClient(SHARES_BLOB);

  try {
    const download = await blobClient.download();

    const chunks = [];

    for await (const chunk of download.readableStreamBody) {
      chunks.push(chunk);
    }

    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return [];
  }
}

async function writeShares(shares) {
  const blockBlobClient = containerClient.getBlockBlobClient(SHARES_BLOB);

  await blockBlobClient.uploadData(
    Buffer.from(JSON.stringify(shares, null, 2)),
    {
      overwrite: true,
      blobHTTPHeaders: {
        blobContentType: "application/json",
      },
    },
  );
}

app.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    const folder = req.body.folder || "";
    const blobName = folder
      ? `${folder}/${Date.now()}-${file.originalname}`
      : `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype,
      },
    });

    res.json({
      message: "File uploaded successfully",
      fileName: blobName,
      url: blockBlobClient.url,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/files", protect, async (req, res) => {
  try {
    let files = [];

    for await (const blob of containerClient.listBlobsFlat()) {
      files.push({
        name: blob.name,
        size: blob.properties.contentLength,
        uploadedAt: blob.properties.createdOn,
      });
    }

    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/download/:filename", async (req, res) => {
  try {
    const blobClient = containerClient.getBlobClient(req.params.filename);
    const downloadResponse = await blobClient.download();

    res.setHeader(
      "Content-Type",
      downloadResponse.contentType || "application/octet-stream",
    );

    downloadResponse.readableStreamBody.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/delete/:filename", protect, async (req, res) => {
  try {
    const filename = req.params.filename;

    const oldBlobClient = containerClient.getBlobClient(filename);
    const trashName = `trash/${Date.now()}-${filename}`;
    const newBlobClient = containerClient.getBlobClient(trashName);

    await newBlobClient.beginCopyFromURL(oldBlobClient.url);
    await oldBlobClient.delete();

    res.json({ message: "Moved to trash" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/rename", protect, async (req, res) => {
  try {
    const { oldName, newName } = req.body;

    if (!oldName || !newName) {
      return res
        .status(400)
        .json({ error: "oldName and newName are required" });
    }

    const oldBlobClient = containerClient.getBlobClient(oldName);
    const newBlobClient = containerClient.getBlobClient(newName);

    await newBlobClient.beginCopyFromURL(oldBlobClient.url);
    await oldBlobClient.delete();

    res.json({ message: "File renamed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/login", (req, res) => {
  const { password } = req.body;

  if (password !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: "Wrong password" });
  }

  res.json({ secret: process.env.APP_SECRET });
});

app.get("/secure-url/:filename", protect, async (req, res) => {
  const filename = req.params.filename;

  const sharedKeyCredential = new StorageSharedKeyCredential(
    process.env.AZURE_STORAGE_ACCOUNT_NAME,
    process.env.AZURE_STORAGE_ACCOUNT_KEY,
  );

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: process.env.AZURE_CONTAINER_NAME,
      blobName: filename,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(Date.now() + 5 * 60 * 1000),
    },
    sharedKeyCredential,
  ).toString();

  const blobClient = containerClient.getBlobClient(filename);

  res.json({
    url: `${blobClient.url}?${sasToken}`,
  });
});

app.put("/restore", protect, async (req, res) => {
  try {
    const { trashName } = req.body;

    const cleanName = trashName.replace(/^trash\/\d+-/, "");
    const oldBlobClient = containerClient.getBlobClient(trashName);
    const newBlobClient = containerClient.getBlobClient(cleanName);

    await newBlobClient.beginCopyFromURL(oldBlobClient.url);
    await oldBlobClient.delete();

    res.json({ message: "File restored" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/permanent-delete/:filename", protect, async (req, res) => {
  try {
    const blobClient = containerClient.getBlobClient(req.params.filename);
    await blobClient.delete();

    res.json({ message: "File permanently deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/empty-trash", protect, async (req, res) => {
  try {
    let deleted = 0;

    for await (const blob of containerClient.listBlobsFlat({
      prefix: "trash/",
    })) {
      await containerClient.deleteBlob(blob.name);
      deleted++;
    }

    res.json({ message: "Trash emptied", deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/create-folder", protect, async (req, res) => {
  try {
    const { folderName } = req.body;

    if (!folderName) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    const cleanFolder = folderName.trim().replace(/^\/+|\/+$/g, "");
    const blobName = `${cleanFolder}/.folder`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(Buffer.from("folder"), {
      blobHTTPHeaders: {
        blobContentType: "text/plain",
      },
    });

    res.json({ message: "Folder created", folder: cleanFolder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/share", protect, async (req, res) => {
  try {
    const { fileName } = req.body;

    const shares = await readShares();

    const id = uuidv4();

    shares.push({
      id,
      fileName,
      created: new Date(),
      expiry: null,
      password: null,
      views: 0,
    });

    await writeShares(shares);

    res.json({
      url: `http://drive.srrihari.app/share/${id}`,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/share/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const shares = await readShares();
    const share = shares.find((item) => item.id === id);

    if (!share) {
      return res.status(404).json({ error: "Share link not found" });
    }

    share.views = (share.views || 0) + 1;

    await writeShares(shares);

    const sharedKeyCredential = new StorageSharedKeyCredential(
      process.env.AZURE_STORAGE_ACCOUNT_NAME,
      process.env.AZURE_STORAGE_ACCOUNT_KEY,
    );

    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: process.env.AZURE_CONTAINER_NAME,
        blobName: share.fileName,
        permissions: BlobSASPermissions.parse("r"),
        expiresOn: new Date(Date.now() + 30 * 60 * 1000),
      },
      sharedKeyCredential,
    ).toString();

    const blobClient = containerClient.getBlobClient(share.fileName);

    res.json({
      fileName: share.fileName,
      url: `${blobClient.url}?${sasToken}`,
      views: share.views,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
