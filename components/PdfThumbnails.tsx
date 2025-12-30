"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";

interface PdfThumbnailProps {
  fileUrl: string;
  width?: number;
  height?: number;
  className?:string;
}
import { pdfjs } from "react-pdf";

const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ fileUrl, width = 120, height = 160, className }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    const renderThumbnail = async () => {
      if (!fileUrl) {
        console.warn("No file URL provided for PDF thumbnail");
        return;
      }

      try {
        const absoluteUrl = new URL(fileUrl, window.location.origin).href;
        const token = localStorage.getItem('AccessToken') || '';
        const pdf = await pdfjs.getDocument({
          url: absoluteUrl,
          httpHeaders: {
            'Authorization': `Bearer ${token}`,
          }
        }).promise;
        const page = await pdf.getPage(1);

        // Use higher scale for better quality (2.0 = 200% of original viewport)
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx!, viewport }).promise;

        // Use high compression quality (90-100)
        setThumbUrl(canvas.toDataURL("image/png", 0.95));
      } catch (err) {
        console.error("Error rendering thumbnail:", err);
      }
    };

    renderThumbnail();
  }, [fileUrl]);

  if (!thumbUrl) {
    return <div className="w-20 h-28 bg-gray-200 animate-pulse rounded" />;
  }

  return (
    <Image
      src={thumbUrl}
      alt="PDF thumbnail"
      width={width}
      height={height}
      quality={100}
      className={`rounded border object-cover ${className}`}
    />
  );
};

export default PdfThumbnail;
