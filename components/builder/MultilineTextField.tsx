'use client'
import { forwardRef } from "react";
import { toast } from "react-hot-toast";

interface MultilineTextFieldProps {
  value?: string;
  textInput: (data: string) => void;
  readOnly?: boolean;
}

const MultilineTextField = forwardRef<HTMLTextAreaElement, MultilineTextFieldProps>((props, ref) => {
  const { value = '', textInput, readOnly = false } = props;

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;

    const inputValue = e.target.value;
    const englishOnly = /^[\x00-\x7F]*$/;
    if (!englishOnly.test(inputValue)) {
      toast.error("Only English characters are supported right now.");
      return;
    }
    textInput(inputValue);
  };

  return (
    <textarea
      ref={ref}
      onChange={handleInput}
      placeholder={readOnly ? '' : "Type here..."}
      className={`overflow-auto resize-none p-1 h-full w-full break-words whitespace-pre-wrap leading-tight ${readOnly ? 'cursor-default bg-transparent' : 'cursor-text bg-white'}`}

      value={value}
      readOnly={readOnly}
    />
  );
});

MultilineTextField.displayName = 'MultilineTextField';

export default MultilineTextField;
