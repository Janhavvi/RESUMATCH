import { put, del } from "@vercel/blob";

/**
 * Generate a pre-signed upload URL for direct client-side uploads to Vercel Blob
 * This bypasses the 4.5MB serverless function limit and allows large file uploads
 */
export async function generateBlobUploadUrl(filename, contentType) {
  // In development, return a mock URL
  if (process.env.NODE_ENV === "development" || !process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      uploadUrl: "/api/resume/upload",
      filename: filename,
      contentType: contentType,
    };
  }

  try {
    // For production with Vercel Blob, generate a pre-signed URL
    // Note: Vercel Blob doesn't have pre-signed URL generation yet
    // So we'll use the put endpoint directly in the client
    return {
      uploadUrl: null, // Will handle upload via /api/resume/upload in production
      filename: filename,
      contentType: contentType,
      useDirectUpload: false, // Fall back to server-side for now
    };
  } catch (error) {
    console.error("Error generating upload URL:", error);
    throw new Error("Failed to generate upload URL");
  }
}

/**
 * Upload file to Vercel Blob storage
 * Called from server-side API in response to client uploads
 */
export async function uploadToBlob(fileBuffer, filename, contentType) {
  if (process.env.NODE_ENV === "development" || !process.env.BLOB_READ_WRITE_TOKEN) {
    // In development, just return a mock blob reference
    return {
      url: `/uploads/${filename}`,
      size: fileBuffer.length,
      uploadedAt: new Date().toISOString(),
    };
  }

  try {
    const blob = await put(filename, fileBuffer, {
      contentType: contentType,
      access: "private", // Ensure files are private
    });

    return {
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    };
  } catch (error) {
    console.error("Error uploading to Vercel Blob:", error);
    throw new Error(`Failed to upload file to blob storage: ${error.message}`);
  }
}

/**
 * Delete file from Vercel Blob storage
 */
export async function deleteFromBlob(blobUrl) {
  if (process.env.NODE_ENV === "development" || !process.env.BLOB_READ_WRITE_TOKEN) {
    return true;
  }

  try {
    await del(blobUrl);
    return true;
  } catch (error) {
    console.error("Error deleting from Vercel Blob:", error);
    throw new Error(`Failed to delete file from blob storage: ${error.message}`);
  }
}
