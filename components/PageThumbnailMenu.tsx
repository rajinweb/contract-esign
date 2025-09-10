import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  RotateCcw,
  ArrowUp,
  ArrowDown,
  FileSymlink,
  Replace,
  Copy,
  Trash2,
} from "lucide-react";

interface Props {
  onClose: () => void;
  triggerElement?:  HTMLElement | null | undefined;
}

const PageThumbnailMenu: React.FC<Props> = ({ onClose, triggerElement }) => {
  const ref = useRef<HTMLDivElement>(null);
  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);
  const listItemCss="flex items-center gap-2 hover:bg-gray-100 p-2 cursor-pointer";
  const menu = (
    <div
      ref={ref}
      className="absolute z-50 bg-white shadow-md border rounded w-48 right-0"
     >
        <ul className="text-sm p-2">
            <li className={listItemCss}>
                <RotateCcw size={16} /> Rotate Page
            </li>
            <li className={listItemCss}>
                <ArrowUp size={16} /> Move Page Up
            </li>
            <li className={listItemCss}>
                <ArrowDown size={16} /> Move Page Down
            </li>
            <li className={listItemCss}>
                <FileSymlink size={16} /> Move Page To...
            </li>
            <li className={listItemCss}>
                <Replace size={16} /> Replace Page
            </li>
            <li className={listItemCss}>
                <Copy size={16} /> Duplicate Page
            </li>
            <li className={`${listItemCss} text-red-600`}>
                <Trash2 size={16} /> Remove Page
            </li>
        </ul>
    </div>
  );

  return createPortal(menu, triggerElement !== null? triggerElement! : document.body!);
};

export default PageThumbnailMenu;
