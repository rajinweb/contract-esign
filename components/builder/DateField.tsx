'use client'
import { useState, useEffect, forwardRef } from "react";
import { InputProps } from '@/types/types';
import Input from '@/components/forms/Input';


const DateField = forwardRef<HTMLInputElement, Omit<InputProps, "ref">>((props, ref) => {
  const {textInput, defaultDate, readOnly, className} = props;
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
        <Input
          ref={ref}
          value={text}
          onChange={handleChange}
          type="date"
          className={className || "text-xs text-center"}
          readOnly={readOnly}
        />

  );
})
DateField.displayName= 'DateField';
export default DateField
