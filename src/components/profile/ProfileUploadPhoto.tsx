import { useState, useRef } from "react";
import ReactCrop, { type Crop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Upload, X, Save, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { KycAvatarBadge } from "./KycAvatarBadge";
import { normalizeKycStatus } from "@/lib/kyc";
import { toast } from "sonner";

export const ProfileUploadPhoto = () => {
  const { profile, updateProfile } = useAuth();
  const profileDocuments = ((profile as any)?.kyc_documents ?? (profile as any)?.kycDocuments) ?? {};
  const kycStatus = normalizeKycStatus((profile as any)?.kyc_status ?? (profile as any)?.kycStatus);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    x: 25,
    y: 25,
    width: 50,
    height: 50,
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }
      
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setSelectedImage(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!selectedImage) return;
    setIsUploading(true);
    try {
      await updateProfile({ avatar_url: selectedImage });
      toast.success("Profile photo updated successfully!");
      setSelectedImage(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update profile photo.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      await updateProfile({ avatar_url: null });
      toast.success("Profile photo removed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove profile photo.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl text-white">
      <h2 className="text-[24px] font-bold mb-6">Upload a Photo</h2>
      
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col items-center">
        {/* Current Photo Area */}
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden bg-gray-800 flex items-center justify-center">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Current" className="w-full h-full object-cover" />
            ) : (
              <UserPlaceholder />
            )}
          </div>
          <KycAvatarBadge status={kycStatus} documents={profileDocuments} />
          {profile?.avatar_url && !selectedImage && (
            <button 
              onClick={handleRemove}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors shadow-lg"
              title="Remove photo"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Upload Controls */}
        {!selectedImage ? (
          <div className="w-full flex-col flex items-center gap-4">
            <p className="text-gray-400 text-[14px] text-center max-w-sm">
              Upload a clear photo of yourself. This will be visible on your public profile and leaderboards.
            </p>
            <input 
              type="file" 
              accept="image/png, image/jpeg, image/gif" 
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="hidden" 
              id="photo-upload"
            />
            <label 
              htmlFor="photo-upload"
              className="bg-[#0b65c2] hover:bg-[#094e96] text-white px-6 py-3 rounded text-[15px] font-bold transition-colors cursor-pointer flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </label>
            <p className="text-[12px] text-gray-500 mt-2">Accepted formats: JPG, PNG, GIF. Max size 5MB.</p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="w-full bg-black/50 p-4 rounded-xl mb-6 overflow-hidden flex justify-center">
              <ReactCrop 
                crop={crop} 
                onChange={(c) => setCrop(c)} 
                aspect={1} 
                circularCrop
              >
                <img src={selectedImage} alt="Crop preview" className="max-h-[300px] object-contain" />
              </ReactCrop>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedImage(null)}
                className="px-6 py-2.5 rounded text-[14px] font-bold border border-white/20 hover:bg-white/10 transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isUploading}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 px-6 py-2.5 rounded text-[14px] font-bold transition-colors flex items-center gap-2"
              >
                {isUploading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const UserPlaceholder = () => (
  <ImageIcon className="w-12 h-12 text-gray-500" />
);
