import { useState, useRef, useEffect } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/dashboard";
import AwsS3 from "@uppy/aws-s3";
import { X, Image as ImageIcon, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@uppy/core/css/style.css";
import "@uppy/dashboard/css/style.css";

export interface UploadedImage {
  id?: string;
  objectPath: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  caption?: string;
  sortOrder: number;
}

interface TradingJournalImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
}

export function TradingJournalImageUploader({
  images,
  onImagesChange,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
}: TradingJournalImageUploaderProps) {
  const [isUploaderReady, setIsUploaderReady] = useState(false);
  const uppyRef = useRef<Uppy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const uppyInstance = new Uppy({
      restrictions: {
        maxFileSize,
        maxNumberOfFiles: maxFiles - images.length,
        allowedFileTypes: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
      },
      autoProceed: false,
    });

    uppyInstance.use(Dashboard, {
      inline: true,
      target: containerRef.current,
      height: 200,
      proudlyDisplayPoweredByUppy: false,
      locale: {
        strings: {
          dropPasteFiles: "Drop images here or %{browseFiles}",
          browseFiles: "browse",
        },
      },
    });

    uppyInstance.use(AwsS3, {
      shouldUseMultipart: false,
      async getUploadParameters(file) {
        const fileExtension = file.name?.split(".").pop() || "jpg";
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

        const data = (await response.json()) as { uploadURL: string };

        return {
          method: "PUT" as const,
          url: data.uploadURL,
          fields: {},
          headers: {
            "Content-Type": file.type || "image/jpeg",
          },
        };
      },
    });

    uppyInstance.on("upload-success", (file, response) => {
      if (file && response.uploadURL) {
        const newImage: UploadedImage = {
          objectPath: response.uploadURL,
          fileName: file.name || "uploaded-image",
          fileSize: file.size,
          mimeType: file.type || "image/jpeg",
          caption: "",
          sortOrder: images.length,
        };
        onImagesChange([...images, newImage]);
      }
    });

    uppyInstance.on("complete", (result) => {
      if (result.successful && result.successful.length > 0) {
        uppyInstance.cancelAll();
      }
    });

    uppyRef.current = uppyInstance;
    setIsUploaderReady(true);

    return () => {
      uppyInstance.cancelAll();
      uppyInstance.destroy();
    };
  }, [images.length, maxFiles, maxFileSize]);

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    // Reorder sortOrder values
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      sortOrder: i,
    }));
    onImagesChange(reorderedImages);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], caption };
    onImagesChange(newImages);
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;

    const newImages = [...images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);

    // Update sortOrder
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      sortOrder: i,
    }));
    onImagesChange(reorderedImages);
  };

  const getImageUrl = (objectPath: string) => {
    if (objectPath.startsWith("http")) {
      return objectPath;
    }
    if (objectPath.startsWith("/objects/")) {
      return objectPath;
    }
    return `/objects/${objectPath}`;
  };

  const canAddMore = images.length < maxFiles;

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group border rounded-lg overflow-hidden bg-muted/50"
            >
              <div className="aspect-square relative">
                <img
                  src={getImageUrl(image.objectPath)}
                  alt={image.caption || image.fileName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-image.png";
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => handleMoveImage(index, index - 1)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => handleRemoveImage(index)}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={() => handleMoveImage(index, index + 1)}
                    disabled={index === images.length - 1}
                    title="Move down"
                  >
                    <GripVertical className="h-4 w-4 -rotate-90" />
                  </Button>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <Input
                  type="text"
                  placeholder="Add caption..."
                  value={image.caption || ""}
                  onChange={(e) => handleCaptionChange(index, e.target.value)}
                  className="text-xs h-8"
                />
                <p className="text-xs text-muted-foreground truncate">
                  {image.fileName}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
        <div className="border-2 border-dashed rounded-lg p-4">
          <div ref={containerRef}>
            {!isUploaderReady && (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
          {images.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {images.length} / {maxFiles} images
            </p>
          )}
        </div>
      )}

      {!canAddMore && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Maximum {maxFiles} images reached
        </div>
      )}
    </div>
  );
}







