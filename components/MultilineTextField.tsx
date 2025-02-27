import { useState, useEffect, forwardRef } from "react";
import { MultiLineTextFieldProps } from '@/types/types';

const MultilineTextField = forwardRef<HTMLTextAreaElement, Omit<MultiLineTextFieldProps, "ref">>((props, ref) => {
  const { initialText = "", heightUpdates } = props;
  const [text, setText] = useState<string>(initialText);
  const [fontSize, setFontSize] = useState<string>('1rem'); // Initial font size
  

  function calcHeight(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    let numberOfLineBreaks = (value.match(/\n/g) || []).length;
    // min-height + lines x line-height + padding + border
    let newHeight = 20 + numberOfLineBreaks * 20 + 12 + 2;
    return newHeight;
  }
  
  // Handle typing and adjusting height
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
  };

  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }

    // Focus and select text when the component mounts
    if (ref && 'current' in ref && ref.current) {
      ref.current.focus();
      ref.current.select();
  
    }
  }, [initialText, ref]);
  

  return (
    <textarea
      ref={ref}
      style={{
        lineHeight: fontSize,
        fontSize,
        overflow: "hidden"
      }}
      onChange={handleInput}
      onKeyUp={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.currentTarget.parentElement) {
          const newHeight = calcHeight({target: e.currentTarget} as React.ChangeEvent<HTMLTextAreaElement>);
          e.currentTarget.parentElement.style.height = `${newHeight}px`;
        }
      }}
      placeholder="Enter text here" 
      className="resize-none p-2 h-full w-full cursor-move"
      value={text}
    />
  );
});

export default MultilineTextField;
