import { useState, useEffect, useRef } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import AwsS3 from "@uppy/aws-s3";
import { apiRequest } from "@/lib/queryClient";
import "@uppy/core/css/style.css";
import "@uppy/dashboard/css/style.css";

interface ObjectUploaderProps {
  allowedFileTypes?: string[];
  maxFileSize?: number;
  maxNumberOfFiles?: number;
  onUploadComplete: (objectPath: string, fileName: string) => void;
  height?: number;
  targetId?: string;
}

export function ObjectUploader({
  allowedFileTypes = [".pdf"],
  maxFileSize = 10 * 1024 * 1024,
  maxNumberOfFiles = 1,
  onUploadComplete,
  height = 300,
  targetId = "uppy-dashboard",
}: ObjectUploaderProps) {
  const [isReady, setIsReady] = useState(false);
  const uppyRef = useRef<Uppy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const uppyInstance = new Uppy({
      restrictions: {
        maxFileSize,
        maxNumberOfFiles,
        allowedFileTypes,
      },
      autoProceed: false,
    });

    uppyInstance.use(Dashboard, {
      inline: true,
      target: containerRef.current,
      height,
      proudlyDisplayPoweredByUppy: false,
      locale: {
        strings: {
          dropPasteFiles: "Drop files here or %{browseFiles}",
          browseFiles: "browse",
        },
      },
    });

    uppyInstance.use(AwsS3, {
      shouldUseMultipart: false,
      async getUploadParameters(file) {
        const fileExtension = file.name?.split(".").pop() || "pdf";
        const response = await fetch("/api/objects/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ fileExtension }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to get upload URL");
        }
        
        const data = await response.json() as { uploadURL: string };

        return {
          method: "PUT" as const,
          url: data.uploadURL,
          fields: {},
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        };
      },
    });

    uppyInstance.on("upload-success", (file, response) => {
      if (file && response.uploadURL) {
        onUploadComplete(response.uploadURL, file.name || "uploaded-file");
      }
    });

    uppyInstance.on("complete", (result) => {
      if (result.successful && result.successful.length > 0) {
        uppyInstance.cancelAll();
      }
    });

    uppyRef.current = uppyInstance;
    setIsReady(true);

    return () => {
      uppyInstance.cancelAll();
      uppyInstance.destroy();
    };
  }, [allowedFileTypes.join(","), maxFileSize, maxNumberOfFiles, height]);

  return (
    <div ref={containerRef} id={targetId}>
      {!isReady && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}

interface SimpleUploaderProps {
  category: "reports" | "strategies";
  onDocumentCreated: () => void;
}

export function SimpleDocumentUploader({
  category,
  onDocumentCreated,
}: SimpleUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [objectPath, setObjectPath] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const handleUploadComplete = (uploadURL: string, name: string) => {
    setObjectPath(uploadURL);
    setFileName(name);
    if (!title) {
      setTitle(name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSaveDocument = async () => {
    if (!objectPath) {
      setError("Please upload a file first");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title for the document");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      await apiRequest("POST", "/api/library-documents", {
        title: title.trim(),
        category,
        objectPath,
        fileName,
      });
      setTitle("");
      setObjectPath("");
      setFileName("");
      onDocumentCreated();
    } catch (err: any) {
      setError(err.message || "Failed to save document");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <ObjectUploader
        allowedFileTypes={[".pdf"]}
        maxFileSize={20 * 1024 * 1024}
        maxNumberOfFiles={1}
        onUploadComplete={handleUploadComplete}
        height={200}
      />

      {objectPath && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-green-600">File uploaded:</span>
            <span className="font-medium">{fileName}</span>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="doc-title"
              className="text-sm font-medium"
            >
              Document Title
            </label>
            <input
              id="doc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this document"
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              data-testid="input-document-title"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            onClick={handleSaveDocument}
            disabled={isUploading || !title.trim()}
            className="w-full px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="button-save-document"
          >
            {isUploading ? "Saving..." : "Save Document"}
          </button>
        </div>
      )}
    </div>
  );
}
