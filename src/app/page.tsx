'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Dynamically import the PaperViewer component with SSR disabled
const PaperViewer = dynamic(
  () => import('@/components/PaperViewer'),
  { ssr: false }
);

export default function PaperPage() {
  useEffect(() => {
    // Add any necessary side effects here
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow">
        <PaperViewer paperPath="/samplepaper.htm" />
      </div>
      <Footer />
    </main>
  );
}
