'use client'
import React from 'react';
import { FileSignature } from 'lucide-react';
import Link from 'next/link'

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <FileSignature className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">BellerivaSign</span>
          </Link>
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-600 hover:text-blue-600">Solutions</Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600">Products</Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600">Pricing</Link>
            <Link href="/" className="text-gray-600 hover:text-blue-600">Resources</Link>
          </nav>
          <div className="flex space-x-4">
            <Link href="/login" className="px-4 py-2 text-blue-600 hover:text-blue-700">Login</Link>
            <Link href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}