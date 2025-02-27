import React from 'react';
import { Button } from './Button';

interface PagingControlProps {
  pageNum: number;
  setPageNum: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
}
const PagingControl: React.FC<PagingControlProps> = ({ pageNum, setPageNum, totalPages }) => {
  return (
    <div className='flex justify-center my-3'>
      <Button title={"<"} onClick={() => setPageNum(pageNum - 1)} disabled={pageNum-1===-1}/>
      <div className='mr-4 leading-5 text-center'>Page <br/>{pageNum + 1} / {totalPages}</div>
      <Button title={">"} onClick={() => setPageNum(pageNum + 1)} disabled={pageNum+1>totalPages-1} />
    </div>
  );
};

export default PagingControl;
