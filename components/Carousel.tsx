import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/autoplay';

// Import required modules
import { Autoplay } from 'swiper/modules';

// Your list of logos
const logos = [
  { alt: 'niva', src: '/images/client_logo/niva.svg' },
  { alt: 'boi', src: '/images/client_logo/boi.svg' },
  { alt: 'bajajcapital', src: '/images/client_logo/bajajcapital.svg' },
  { alt: 'badjate', src: '/images/client_logo/badjate.svg' },
  { alt: 'bonanza', src: '/images/client_logo/bananza.svg' },
  { alt: 'cholams', src: '/images/client_logo/cholams.svg' },
  { alt: 'emkayglobal', src: '/images/client_logo/emkay.svg' },
  { alt: 'Gng', src: '/images/client_logo/gng.svg' },
  { alt: 'Jmfinacial', src: '/images/client_logo/JM financial.svg' },
  { alt: 'Ac Agarwal', src: '/images/client_logo/ac aggarwal.svg' },
  { alt: 'kunvarji', src: '/images/client_logo/kunwar ji.svg' },
  { alt: 'Marwadionline', src: '/images/client_logo/marwadi.svg' },
  { alt: 'moneyisel', src: '/images/client_logo/moneyisle.svg' },
  { alt: 'Nivabupa', src: '/images/client_logo/Nivabupa.svg' },
  { alt: 'rkfs-logo', src: '/images/client_logo/rkfs.svg' },
  { alt: 'spfl', src: '/images/client_logo/spfl.svg' },
  { alt: 'sharewealth_logo', src: '/images/client_logo/sharewealth.svg' },
  { alt: 'sunidhi', src: '/images/client_logo/sunidhi.svg' },
  { alt: 'sureshrathi', src: '/images/client_logo/suresha rathi.svg' },
  { alt: 'tradewell', src: '/images/client_logo/tradewell.svg' },
];

const Carousel = () => {
  return (
  <section className="flex flex-col items-center pt-10 mt-10 bg-[linear-gradient(180deg,#F0F5FF_10.34%,#FFFFFF_51.96%)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <h1 className="text-3xl font-medium text-black text-center"> Trusted By Great Companies </h1>
        <div className="mt-8">
          <Swiper
            modules={[Autoplay]}
            speed={18000}
            loop={true}
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
            }}
            freeMode={false}
            slidesPerView={'auto'}
            spaceBetween={30}
            breakpoints={{
              640: {
                slidesPerView: 3,
                spaceBetween: 40,
              },
              768: {
                slidesPerView: 4,
                spaceBetween: 50,
              },
              1024: {
                slidesPerView: 6,
                spaceBetween: 60,
              },
            }}
          >
            {logos.map((logo, index) => (
              <SwiperSlide key={index}>
                <div className="flex justify-center items-center p-4">
                  <img
                    alt={logo.alt}
                    height="55"
                    src={logo.src}
                    width="120"
                    loading="lazy"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
</section>
  );
};

export default Carousel;