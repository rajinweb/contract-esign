'use client'
import { useState, useEffect, forwardRef } from "react";
import { InputProps } from '@/types/types';
import { toast } from "react-hot-toast"; // or any toast lib you use

const MultilineTextField = forwardRef<HTMLTextAreaElement, Omit<InputProps, "ref">>((props, ref) => {
  const { textInput } = props;
  const [text, setText] = useState<string>('');

  function calcHeight(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const numberOfLineBreaks = (value.match(/\n/g) || []).length;
    // min-height + lines x line-height + padding + border
    const newHeight = 20 + numberOfLineBreaks * 20 + 12 + 2;
    return newHeight;
  }
  
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
      onKeyUp={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.currentTarget.parentElement) {
          const newHeight = calcHeight({target: e.currentTarget} as React.ChangeEvent<HTMLTextAreaElement>);
          e.currentTarget.parentElement.style.height = newHeight < 300 ? `${newHeight}px` : '300px';
        }
      }}
      placeholder="Type here..."
      className="bg-transparent overflow-auto resize-none p-2 h-full w-full cursor-move overflow-y-auto"
      value={text}
    />
  );
});

MultilineTextField.displayName = 'MultilineTextField';

export default MultilineTextField;
