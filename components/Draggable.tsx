'use client';
import { Rnd } from "react-rnd";
import {DragFields} from '../types/types'
import { Check, X } from "lucide-react";

export default function DragableField({
  onSet,
  onCancel,
  onEnd,
  defaultPosition,
  children
}: DragFields) {
  return (
    <Rnd 
      onDragStop={(e, d) => { onEnd({ x: d.x, y: d.y }) }} 
      default={{
        x: defaultPosition?.x || 0,
        y: defaultPosition?.y || 0,
        width: "auto",
        height: 'auto'
      }}
      minHeight={100}
      bounds="window"
      className="absolute z-10 border-2 hover:border-blue-500"
    
    >
      <div className="absolute -right-10 -top-[2px] rounded-tr-lg rounded-br-lg  w-10  items-center flex-col text-white focus-within:border-blue-500 ">
            <a href='#' onClick={(e)=>{
              e.preventDefault();
              e.stopPropagation();
              onCancel()
            }}><X size={12} className="bg-red-500 w-full p-1 h-1/2"/></a>       
            <a href='#'  onClick={(e)=>{
              e.preventDefault();
              e.stopPropagation();
              onSet(e)
            }} ><Check size={20} className="bg-blue-500 w-full p-1 h-1/2" /></a>
        </div>
        {children}
     
    </Rnd>
  );
}
