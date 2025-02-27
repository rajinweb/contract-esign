'use client';
import {ImageFieldProps} from '../types/types'
export default function ImageField({image}: ImageFieldProps) {
  return (<img src={image} alt="Image" className="h-full" draggable="false" /> );
}
