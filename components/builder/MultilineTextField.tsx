'use client'
import { useState, useEffect, forwardRef } from "react";
import { InputProps } from '@/types/types';
import { toast } from "react-hot-toast"; // or any toast lib you use

const MultilineTextField = forwardRef<HTMLTextAreaElement, Omit<InputProps, "ref">>((props, ref) => {
  const { textInput } = props;
  const [text, setText] = useState<string>('');

  
  // Handle typing and adjusting height
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    // ✅ English-only check //To-Do
    const englishOnly = /^[\x00-\x7F]*$/;
    if (!englishOnly.test(value)) {
      toast.error("Only English characters are supported right now.");
      return; // ignore non-English input
    }

    setText(value);
    textInput(value)
  };

  useEffect(() => {
    // Focus and select text when the component mounts
    if (ref && 'current' in ref && ref.current) {
      ref.current.focus();
    }
  }, [ref]);
  

  return (
    <textarea
      ref={ref}
      onChange={handleInput}
      placeholder="Type here..."
      className="overflow-auto resize-none p-2 h-full w-full cursor-move overflow-y-auto"
      value={text}
    />
  );
});

MultilineTextField.displayName = 'MultilineTextField';

export default MultilineTextField;
