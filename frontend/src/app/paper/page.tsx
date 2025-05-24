'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Dynamically import the PaperViewer component with SSR disabled
const PaperViewer = dynamic(
  () => import('@/components/PaperViewer'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }
);

export default function PaperPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="min-h-screen w-screen">
        <PaperViewer paperPath="/samplepaper.htm" />
      </div>
      <Footer />
    </main>
  );
}
