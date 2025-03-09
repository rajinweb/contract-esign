'use client'
import { useState, useEffect, forwardRef } from "react";
import { InputProps } from '@/types/types';


const DateField = forwardRef<HTMLInputElement, Omit<InputProps, "ref">>((props, ref) => {
  const {textInput, defaultDate} = props;
  const [text, setText] = useState<string>(defaultDate ? defaultDate : '');
  
  useEffect(() => {
    if (ref && 'current' in ref && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [ref]);

  useEffect(() => {
    if (defaultDate && !isNaN(new Date(defaultDate).getTime())) {
      setText(new Date(defaultDate).toISOString().substring(0, 10));
    }
  }, [defaultDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);
    textInput(value)
  };

  return (
        <input
          ref={ref}
          value={text}
          onChange={handleChange}
          type="date"
          className="w-full bg-transparent text-[12px] text-center mt-3"           
        />

  );
})
export default DateField