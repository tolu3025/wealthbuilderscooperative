import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  userId: string;
  fileType?: string;
  bucket?: string;
  label?: string;
}

export const FileUpload = ({ onUploadComplete, userId, fileType = "receipt", bucket = "payment-receipts", label = "Upload Payment Proof (JPG, PNG, or PDF)" }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG, PNG, or PDF file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${fileType}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) throw error;

      // Check if bucket is public (blog-images, avatars, property-images)
      const publicBuckets = ['blog-images', 'avatars', 'property-images'];
      
      if (publicBuckets.includes(bucket)) {
        // For public buckets, return the public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
        onUploadComplete(urlData.publicUrl);
      } else {
        // For private buckets, return the storage path
        const storagePath = `${bucket}/${fileName}`;
        onUploadComplete(storagePath);
      }
      
      toast({
        title: "Upload successful",
        description: "Your file has been uploaded successfully",
      });
      
      setFile(null);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="file-upload">{label}</Label>
        <div className="mt-2">
          <Input
            id="file-upload"
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>
      </div>

      {file && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm">{file.name}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFile(null)}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {file && !uploading && (
        <Button onClick={handleUpload} className="w-full gap-2">
          <Upload className="h-4 w-4" />
          Upload File
        </Button>
      )}

      {uploading && (
        <div className="text-center text-sm text-muted-foreground">
          Uploading...
        </div>
      )}
    </div>
  );
};
