'use client';
import React, { useState } from 'react';
import Link from 'next/link';

const plans = [
  {
    title: 'Business',
    monthly: 12,
    annually: 8,
    price: '$8',
    period: '/mo',
    description: 'Essential eSignature functionality for desktop and mobile users.',
    features: [
      'Send documents for signature',
      'Basic fillable fields',
      'Mobile app',
      'Unlimited templates',
      'Cloud storage integration',
    ],
    button: 'Choose Business Plan',
    href: '#',
    popular: false,
  },
  {
    title: 'Business Premium',
    monthly: 20,
    annually: 15,
    price: '$15',
    period: '/mo',
    description: 'Enhanced eSignature capabilities and collaboration.',
    features: [
      'Everything in Business',
      'Set reminders & notifications',
      'Send in bulk',
      'Signing link invites',
      'Document groups',
      'Request payments',
    ],
    button: 'Choose Premium Plan',
    href: '#',
    popular: true,
  },
  {
    title: 'Enterprise',
    monthly: 40,
    annually: 30,
    price: '$30',
    period: '/mo',
    description: 'Advanced features and branded eSignature workflows.',
    features: [
      'Everything in Premium',
      'Advanced threat protection',
      'Signer attachments',
      'Conditional documents',
      'Smart fillable fields',
    ],
    button: 'Choose Enterprise Plan',
    href: '#',
    popular: false,
  },
  {
    title: 'Site License',
    price: '$1.50',
    period: '/signature',
    description: 'Unparalleled ROI, flexibility, integrations and automation.',
    features: [
      'Full API access',
      'Volume discounts',
      'CRM/ERP integration',
      'Industry-specific compliance',
      'Unlimited users',
    ],
    button: 'Contact Sales',
    href: '#',
    popular: false,
    isPerInvite: true,
    dark: true,
  },
];

const PricingPlans = () => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually');
  return (
    <section className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="text-center mb-12">
        <p className="text-indigo-600 text-sm font-semibold uppercase">Unlimited users for all plans</p>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mt-2">
          Increase productivity and improve collaboration with SecureSign
        </h1>
        <p className="text-gray-500 mt-4">
          Select a subscription plan for your team or try advanced functionality for free.
        </p>
      </div>


       <div className="text-center mb-8">
        <p className="text-sm text-emerald-700 font-semibold mb-2">
            <span className='flex justify-center'>Save up to 60%
                <svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 3a13.17 13.17 0 0 1 9 12.49V21m-3-3 3 3 3-3" style={{
                    stroke:'#047857',
                    fill:'none', 
                    strokeLinecap:'round',
                    strokeLinejoin:'round',
                    strokeWidth:1}}/>
                </svg>
            </span>
        </p>
        <div className="inline-flex items-center border border-gray-300 rounded-full overflow-hidden">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              billingCycle === 'monthly' ? 'bg-gray-200 text-black' : 'text-gray-500'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Bill Monthly
          </button>
          <button
            className={`px-4 py-2 text-sm font-bold ${
              billingCycle === 'annually'
                ? 'bg-emerald-700 text-white'
                : 'text-gray-500'
            }`}
            onClick={() => setBillingCycle('annually')}
          >
            Bill Annually
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {plans.map((plan, index) => {
            const price = billingCycle === 'monthly' ? plan.monthly : plan.annually;
            
            return(
                <div
                    key={index}
                    className={`relative border rounded-lg p-6 flex flex-col shadow-sm ${
                    plan.popular ? 'bg-indigo-50 shadow-md' : ''
                    } ${plan.dark ? 'bg-gray-900 text-white' : ''}`}
                >
                    {plan.popular && (
                    <span className="absolute top-2 right-2 bg-yellow-400 text-xs font-bold px-2 py-1 rounded uppercase">
                        Most Popular
                    </span>
                    )}
                    <div
                    className={`text-sm ${
                        plan.dark ? 'bg-gray-700 text-white' : 'bg-indigo-50 text-indigo-700'
                    } px-3 py-1 rounded-full self-start mb-4`}
                    >
                    Unlimited users
                    </div>

                    <h2 className="text-xl font-semibold mb-2">{plan.title}</h2>
                    <p className={`mb-4 ${plan.dark ? 'text-gray-300' : 'text-gray-500'}`}>{plan.description}</p>

                    <div className="text-3xl font-bold mb-2">
                    {price}
                    <span className={`text-base font-medium ml-1 ${plan.dark ? 'text-gray-300' : 'text-gray-500'}`}>
                        {plan.period}
                    </span>
                    </div>

                    <ul className={`text-sm space-y-2 mb-6 ${plan.dark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {plan.features.map((feature, i) => (
                        <li key={i}>✔ {feature}</li>
                    ))}
                    </ul>

                    <Link
                    href={plan.href}
                    className={`mt-auto inline-block text-center py-2 px-4 rounded transition ${
                        plan.dark
                        ? 'bg-white text-gray-900 hover:bg-gray-200'
                        : plan.popular
                        ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                    >
                    {plan.button}
                    </Link>
                </div>
            )
        })
        
        }
      </div>
    </section>
  );
};

export default PricingPlans;
