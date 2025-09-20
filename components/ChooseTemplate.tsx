import React from "react";
import Image from "next/image";
import { ArrowBigRightDash } from "lucide-react";

const ChooseTemplate = () => {
  const thumbnailCSS="w-32 h-40 rounded-xl border-2 border-gray-100 p-2"
  return (
    <section className="container flex gap-8 max-w-7xl mx-auto px-10 flex-col">
      <h2 className="pt-5">Find your perfect template. Set the tone and create something epic!</h2>
      <div className="flex items-center justify-between w-full">
       <div className="w-40 flex items-center gap-2"> <Image src={'/images/template-select.png'} width={140} height={140} quality={100} alt="Placeholder"  /> <ArrowBigRightDash size={30} color="rgb(21 133 252)" /></div>
        <div className="flex space-x-4">
          <div className={thumbnailCSS}>
            <Image src={'/images/templates/la.jpg'} width={120} height={160} quality={100} alt="Loan Agreement Template" className="h-full" />
          </div>
          <div className={thumbnailCSS}>
            <Image src={'/images/templates/nda.jpg'} width={132} height={164} quality={100} alt="Non-Disclosure Agreement Template" className="h-full" />
          </div>
          <div className={thumbnailCSS}>
            <Image src={'/images/templates/poa.jpg'} width={132} height={164} quality={100} alt="Power of Attorney Template" className="h-full"/>
          </div>
          <div className={thumbnailCSS}>
            <Image src={'/images/templates/ra.jpg'} width={132} height={164} quality={100} alt= "Rental/Lease Agreement Template" className="h-full" />
          </div>
          <div className={thumbnailCSS}>
            <Image src={'/images/templates/pa.jpg'} width={132} height={164} quality={100} alt="Partnership Agreement Template" className="h-full" />
          </div>
        </div>
        <button className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition w-60">
          Choose Template
        </button>
      </div>
    </section>
  );
};

export default ChooseTemplate;

