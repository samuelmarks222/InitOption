import { useState, useEffect } from "react";
import { Upload, Download, Trash2, Plus, AlertCircle } from "lucide-react";
import { api } from "@/integrations/api/client";
import { cloudinaryClient } from "@/integrations/cloudinary/client";
import { toast } from "@/hooks/use-toast";

interface PromoMaterial {
  id: string;
  name: string;
  file_url: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

const PromoMaterials = () => {
  const [materials, setMaterials] = useState<PromoMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      // TODO: Create promo_materials table in database
      const { data, error } = await api
        .from("promo_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") {
        throw error;
      }
      setMaterials(data || []);
    } catch (error: any) {
      console.error("Error fetching materials:", error);
      if (error.code !== "PGRST116") {
        toast({
          title: "Error loading materials",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file is zip
      if (!selectedFile.name.endsWith(".zip")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a ZIP file containing banner images",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 50MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !name.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a name and select a ZIP file",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload file to Cloudinary
      const uploadResult = await cloudinaryClient.upload(file, "promo_materials");

      // Create database record
      const { error: dbError } = await api.from("promo_materials").insert({
        name: name.trim(),
        file_url: uploadResult.url,
        file_size: file.size,
      });

      if (dbError) throw dbError;

      toast({
        title: "Upload successful!",
        description: `"${name}" has been added to promo materials.`,
      });

      setFile(null);
      setName("");
      fetchMaterials();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      // Delete from database
      const { error: dbError } = await api
        .from("promo_materials")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast({
        title: "Deleted successfully",
        description: `"${fileName}" has been removed.`,
      });

      setMaterials(materials.filter((m) => m.id !== id));
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Promo Materials</h2>
          <p className="text-sm text-slate-300 mt-1">
            Manage zipped banner images for referral partners to download and use for marketing.
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="border border-slate-700 rounded-lg p-6 bg-slate-800/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Upload size={20} />
          Upload New Banner Pack
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Pack Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Summer Promo 2026, Black Friday Banners"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              ZIP File (max 50MB)
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="block w-full px-4 py-3 border-2 border-dashed border-slate-600 rounded-lg text-center cursor-pointer hover:border-blue-500 hover:bg-slate-700/50 transition-colors"
              >
                {file ? (
                  <div className="text-green-400">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <p className="font-medium">Click to upload ZIP file</p>
                    <p className="text-sm">or drag and drop</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={uploading || !file || !name.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              <Upload size={16} />
              {uploading ? "Uploading..." : "Upload"}
            </button>
            <button
              onClick={() => {
                setFile(null);
                setName("");
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        <span className="text-sm text-gray-400">
          {filteredMaterials.length} of {materials.length} materials
        </span>
      </div>

      {/* Materials List */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading materials...</div>
        ) : materials.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto mb-2 text-gray-500" size={24} />
            <p className="text-gray-400">No promo materials uploaded yet</p>
            <p className="text-sm text-gray-500 mt-1">Upload a ZIP file with banner images to get started</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No materials match your search</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800 border-b border-slate-700">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-200">Name</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-200">File Size</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-200">Uploaded</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredMaterials.map((material) => (
                  <tr
                    key={material.id}
                    className="hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="px-6 py-3 text-white">{material.name}</td>
                    <td className="px-6 py-3 text-gray-400">
                      {formatFileSize(material.file_size)}
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-sm">
                      {formatDate(material.created_at)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={material.file_url}
                          download={`${material.name}.zip`}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                          title="Download to verify"
                        >
                          <Download size={14} />
                          Download
                        </a>
                        <button
                          onClick={() =>
                            handleDelete(material.id, material.name)
                          }
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="border border-slate-700 rounded-lg p-4 bg-blue-900/20 text-blue-200">
        <p className="text-sm">
          <strong>Note:</strong> Users can download these zipped banner packs from their referral section.
          They can use the marketing materials to promote your platform.
        </p>
      </div>
    </div>
  );
};

export default PromoMaterials;
