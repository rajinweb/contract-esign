"use client";
import React, { useEffect, useState } from "react";
import { pdfjs } from "react-pdf";
import Image from "next/image";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

interface PdfThumbnailProps {
  fileUrl: string;
  width?: number;
  height?: number;
  className?:string;
}

const PdfThumbnail: React.FC<PdfThumbnailProps> = ({ fileUrl, width = 80, height = 10, className }) => {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    const renderThumbnail = async () => {
      try {
        const pdf = await pdfjs.getDocument(fileUrl).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 0.2 }); // adjust scale for sharper preview
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx!, viewport }).promise;

        setThumbUrl(canvas.toDataURL("image/png")); // blob-like base64 string
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
      className={`rounded border object-cover ${className}`}
    />
  );
};

export default PdfThumbnail;
