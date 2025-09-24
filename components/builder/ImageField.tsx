'use client';
import Image from 'next/image';
import {ImageFieldProps} from '../../types/types'
export default function ImageField({image}: ImageFieldProps) {
  if (!image) return null;
  return (<Image src={image} alt="Image" className="h-full w-full" draggable="false" width={100} height={100} /> );
}
