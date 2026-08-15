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

export interface CloudinaryExistsResult {
  exists: boolean;
  public_id?: string;
  url?: string;
}

export const cloudinaryClient = {
  async upload(file: File, folder: string = "uploads", publicId?: string): Promise<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    if (publicId) formData.append("public_id", publicId);

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

  async exists(publicId: string, folder?: string): Promise<CloudinaryExistsResult> {
    const params = new URLSearchParams({ public_id: publicId });
    if (folder) params.append("folder", folder);

    const response = await fetch(`/api/cloudinary/exists?${params.toString()}`);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to check asset");
    }

    return result as CloudinaryExistsResult;
  },

  async delete(publicId: string, folder?: string): Promise<CloudinaryDeleteResult> {
    const response = await fetch("/api/cloudinary/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(folder ? { public_id: publicId, folder } : { public_id: publicId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Delete failed");
    }

    return result;
  },
};