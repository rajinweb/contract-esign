'use client';
import React from 'react';
import { Shield, Users, Building2 } from 'lucide-react';

export function Footer() {
  return (
    <div className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Why Choose SecureSign?
        </h2>
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
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="p-6 bg-white rounded-lg border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
