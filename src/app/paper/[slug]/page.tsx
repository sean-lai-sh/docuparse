import dynamic from 'next/dynamic'

interface PageProps {
  params: {
    slug: string;
  };
}

// Dynamically import Dympaper to ensure it's a client component
const Dympaper = dynamic(() => import('@/components/Dympaper'), {
    ssr: false, // Optional: If you want it only rendered on client
  });


export default function Page({ params }: PageProps) {
  const { slug } = params;
  
  return (
    <main className="min-h-screen flex flex-col bg-gray-50"> 
        <Dympaper slug={slug}/>
    </main>
  );
}
