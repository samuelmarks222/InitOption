export interface CloudinaryUploadResult {
  url: string;
  public_id: string;
  format: string;
  width?: number;
  height?: number;
  bytes?: number;
}

export interface CloudinaryDeleteResult {
  result: string;
}

export const cloudinaryClient = {
  async upload(file: File, folder: string = "uploads"): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const response = await fetch("/api/cloudinary/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Upload failed");
    }

    return result;
  },

  async getPublicUrl(publicId: string, folder?: string): Promise<string> {
    const params = new URLSearchParams({ public_id: publicId });
    if (folder) params.append("folder", folder);

    const response = await fetch(`/api/cloudinary/public-url?${params.toString()}`);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to get public URL");
    }

    return result.url;
  },

  async delete(publicId: string): Promise<CloudinaryDeleteResult> {
    const response = await fetch("/api/cloudinary/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Delete failed");
    }

    return result;
  },
};

export function getCloudinaryUrl(publicId: string, options?: { folder?: string; transformation?: string }): string {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    console.warn("VITE_CLOUDINARY_CLOUD_NAME not set");
    return "";
  }

  const base = `https://res.cloudinary.com/${cloudName}/image/upload`;
  const folder = options?.folder ? `${options.folder}/` : "";
  const transformation = options?.transformation ? `${options.transformation}/` : "";
  return `${base}/${transformation}${folder}${publicId}`;
}