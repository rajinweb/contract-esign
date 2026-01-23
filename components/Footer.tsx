'use client';
import React from 'react';
import { Shield, Users, Building2 } from 'lucide-react';

export function Footer() {
  return (
    <div className="mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-medium text-black text-center">
          Why Choose DocYouSign?
        </h2>
        <p className='max-w-5xl
         text-gray-500 text-center m-auto my-4'>Aadhaar-based eSign is a government-authorized digital signing method that allows you to sign documents securely using your Aadhaar number and a one-time password (OTP).</p>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-blue-600" />}
            title="Secure & Compliant"
            description="ISO 27001 certified with full legal validity under IT Act"
          />
          <FeatureCard
            icon={<Users className="h-8 w-8 text-blue-600" />}
            title="Easy Collaboration"
            description="Sign documents with multiple parties in minutes"
          />
          <FeatureCard
            icon={<Building2 className="h-8 w-8 text-blue-600" />}
            title="Enterprise Ready"
            description="Scalable solutions for businesses of all sizes"
          />
        </div>

        <div className="py-10 ">
          {/* Social Icons */}
          <ul className="flex space-x-4 justify-center mb-6">
            <li>
              <a
                href="https://www.facebook.com/DocYouSign"
                title="Facebook"
                target="_blank"
                rel="nofollow"
                className="hover:opacity-80 transition"
              >
                {/* Facebook SVG */}
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="20" fill="#F9F9F9" />
                  <path d="M24.623 10.0042L22.225 10C19.53 10 17.789 11.9319 17.789 14.922V17.1914H15.377C15.169 17.1914 15 17.3741 15 17.5994V20.8875C15 21.1128 15.169 21.2953 15.377 21.2953H17.789V29.5922C17.789 29.8175 17.958 30 18.166 30H21.312C21.521 30 21.69 29.8173 21.69 29.5922V21.2953H24.509C24.718 21.2953 24.887 21.1128 24.887 20.8875L24.888 17.5994C24.888 17.4912 24.848 17.3876 24.777 17.311C24.707 17.2345 24.61 17.1914 24.51 17.1914H21.69V15.2676C21.69 14.343 21.893 13.8736 23.007 13.8736L24.623 13.873C24.831 13.873 25 13.6903 25 13.4651V10.412C25 10.1871 24.831 10.0046 24.623 10.0042Z" fill="#2C2C2C" />
                </svg>
              </a>
            </li>
          
            <li>
              <a
                href="https://x.com/DocYouSign"
                title="Twitter"
                target="_blank"
                rel="nofollow"
                className="hover:opacity-80 transition"
              >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="20" cy="20" r="20" fill="#F9F9F9"></circle>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M11.3571 11.3994C11.4161 11.4815 12.7811 13.4221 14.3906 15.7117C16 18.0014 17.4886 20.1188 17.6985 20.4172C17.9085 20.7155 18.0802 20.9656 18.0802 20.9729C18.0802 20.9803 18.0021 21.0744 17.9065 21.1821C17.811 21.2899 17.5418 21.5949 17.3085 21.8599C17.0751 22.1249 16.6817 22.5715 16.4342 22.8524C16.1868 23.1333 15.7514 23.6277 15.4668 23.951C15.1822 24.2743 14.6703 24.8556 14.3293 25.2427C13.2748 26.44 13.1226 26.613 12.3199 27.5262C11.8913 28.0138 11.4802 28.48 11.4065 28.5622C11.3328 28.6444 11.2725 28.7203 11.2725 28.7308C11.2725 28.7432 11.5417 28.75 12.031 28.75H12.7895L13.6234 27.8008C14.0821 27.2787 14.5346 26.7649 14.6289 26.6589C14.8329 26.4297 16.3884 24.6619 16.5191 24.5107C16.5692 24.4528 16.6419 24.3704 16.6807 24.3276C16.7196 24.2848 17.0256 23.9375 17.3608 23.5559C17.696 23.1743 17.9795 22.8527 17.9907 22.8413C18.002 22.8299 18.1794 22.6282 18.3851 22.3932C18.5907 22.1582 18.7654 21.9659 18.7731 21.9659C18.7809 21.9659 19.8373 23.4598 21.1207 25.2857C22.4041 27.1115 23.4771 28.6378 23.5051 28.6773L23.5561 28.7492L26.1579 28.7496C28.2976 28.7499 28.7581 28.7455 28.7499 28.7247C28.7412 28.7026 27.4946 26.9266 24.2965 22.3802C21.9943 19.1073 21.6881 18.6675 21.6969 18.6452C21.7054 18.6235 22.019 18.2653 24.0806 15.9221C24.4343 15.5202 24.9218 14.9659 25.164 14.6903C25.4062 14.4146 25.6507 14.1371 25.7074 14.0735C25.764 14.0099 26.062 13.6717 26.3696 13.3219C26.6771 12.9721 27.1999 12.3777 27.5314 12.001C27.8629 11.6244 28.1462 11.3013 28.1611 11.2831C28.1866 11.2519 28.1433 11.25 27.4177 11.25H26.6473L26.3046 11.6403C25.8485 12.1597 25.024 13.0963 24.7899 13.361C24.6865 13.478 24.5575 13.625 24.5032 13.6876C24.449 13.7503 24.3419 13.8714 24.2653 13.9568C24.1887 14.0422 23.8028 14.4807 23.4076 14.9312C23.0125 15.3817 22.6838 15.7546 22.6772 15.7599C22.6706 15.7652 22.5859 15.8611 22.489 15.9731C22.3196 16.1689 22.1472 16.3649 21.3564 17.2606C21.0093 17.6538 20.9915 17.6707 20.9622 17.6345C20.9454 17.6137 19.9282 16.1688 18.7018 14.4235L16.472 11.2504L13.861 11.2502L11.25 11.25L11.3571 11.3994ZM13.395 12.44C13.4146 12.4692 13.9024 13.1523 14.4791 13.9579C15.5727 15.4858 19.8703 21.4934 22.6342 25.3579C23.5174 26.5929 24.2507 27.6142 24.2639 27.6275C24.2827 27.6466 24.5399 27.6507 25.4655 27.6468L26.6432 27.6418L23.5615 23.3343C21.8666 20.9651 19.4126 17.535 18.1082 15.7117L15.7366 12.3968L14.548 12.3918L13.3594 12.3868L13.395 12.44Z" fill="#2C2C2C"></path>
                                    </svg>
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/company/DocYouSign"
                title="LinkedIn"
                target="_blank"
                rel="nofollow"
                className="hover:opacity-80 transition"
              >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="#F9F9F9"></path>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M14.6231 10C13.3396 10 12.5 10.8811 12.5 12.0397C12.5 13.1731 13.3153 14.081 14.5733 14.081H14.5984C15.9069 14.081 16.7206 13.1733 16.7206 12.0397C16.6959 10.8811 15.9069 10 14.6231 10ZM30 20.729V27.4998H26.2492V21.1825C26.2492 19.5955 25.7067 18.5125 24.349 18.5125C23.3126 18.5125 22.6958 19.2424 22.4245 19.9484C22.3255 20.2008 22.3001 20.5522 22.3001 20.9055V27.4998H18.548C18.548 27.4998 18.5985 16.8004 18.548 15.6918H22.2997V17.3656C22.2961 17.3715 22.292 17.3776 22.2879 17.3837C22.2833 17.3905 22.2788 17.3973 22.275 17.4037H22.2997V17.3656C22.7981 16.5621 23.6883 15.4144 25.6808 15.4144C28.1494 15.4144 30 17.1021 30 20.729ZM16.4735 27.5001H12.7229V15.6921H16.4735V27.5001Z" fill="#2C2C2C"></path>
                                    </svg>
              </a>
            </li>
            <li>
              <a
                href="https://www.youtube.com/channel/DocYouSign"
                title="YouTube"
                target="_blank"
                rel="nofollow"
                className="hover:opacity-80 transition"
              >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 40C31.0457 40 40 31.0457 40 20C40 8.9543 31.0457 0 20 0C8.9543 0 0 8.9543 0 20C0 31.0457 8.9543 40 20 40Z" fill="#F9F9F9"></path>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M27.8043 13.1764C28.663 13.4129 29.3478 14.1224 29.5761 15.0122C30 16.634 30 20.0014 30 20.0014C30 20.0014 30 23.3801 29.5761 24.9906C29.3478 25.8803 28.663 26.5899 27.8043 26.8264C27.0345 27.0439 23.5793 27.4979 20.099 27.5C16.5526 27.502 12.9801 27.0481 12.1957 26.8264C11.337 26.5899 10.6522 25.8803 10.4239 24.9906C10 23.3688 10 20.0014 10 20.0014C10 20.0014 10 16.634 10.413 15.0234C10.6413 14.1337 11.3261 13.4242 12.1848 13.1877C12.963 12.9678 16.4874 12.5025 20.0082 12.5C23.52 12.4975 27.0282 12.9571 27.8043 13.1764ZM23.1956 20.0017L18 16.8933V23.1101L23.1956 20.0017Z" fill="#2C2C2C"></path>
                                    </svg>
              </a>
            </li>
          </ul>

          {/* Footer Links */}
          <nav className="text-center text-sm text-gray-700 mb-4">
            <ul className="flex flex-wrap justify-center gap-4">
              <li><a href="/security" className="hover:underline">Security and Compliance</a></li>
              <li><a href="/privacy_notice" className="hover:underline">Privacy Notice</a></li>
              <li><a href="/dmca" className="hover:underline">DMCA</a></li>
              <li><a href="/patents" className="hover:underline">Patents</a></li>
              <li><a href="/terms" className="hover:underline">Terms of Service</a></li>
              <li><a href="/bug-bounty-policy" className="hover:underline">Bug Bounty Policy</a></li>
            </ul>
          </nav>

          {/* Copyright */}
          <div className="text-center text-sm text-gray-500 mb-4">
            © 2025 DocYouSign Inc. All rights reserved.
          </div>

    </div>


      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }:{icon: React.ReactElement, title:string, description:string}) {
  return (
    <div className="p-6 bg-gray-100/25 rounded-lg border-2 border-gray-100 hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
