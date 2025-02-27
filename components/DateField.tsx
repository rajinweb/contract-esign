
import { useState, useEffect, forwardRef } from "react";
import {TextFieldProps} from '@/types/types'


const DateField = forwardRef<HTMLInputElement, Omit<TextFieldProps, "ref">>((props, ref) => {
  const {initialText = "", type = "text"} = props;
  const [text, setText] = useState<string | Date>(initialText)
  

  useEffect(() => {
    if(initialText){
      setText(initialText);
    }
    if(type=='Date'){
        var curr = new Date();    
        setText(curr);
    }
    if (ref && 'current' in ref && ref.current) {
      ref.current.focus();
      ref.current.select();
    }

  }, [initialText, type, ref]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
  };

  return (
 
        <input
          ref={ref}
          value={type === 'Date' && text instanceof Date ? text.toISOString().split('T')[0] : String(text)}
          onChange={handleChange}
          placeholder="Text" 
          type={type === 'Date' ? 'date' : type}
          className="text-xl p-2 h-20 cursor-move"
        />

  );
})
export default DateField