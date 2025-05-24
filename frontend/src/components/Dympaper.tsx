'use client'
import { useState, useEffect } from 'react';
import PaperViewer from './PaperViewer'
import TextHoverExtractor from './TextExtractor'
import AgentPanel from './AgentPanel';
import TextExtractor from './gptextractor';
import GazeTracker from './GazeTracker';

interface DymPaperProps {
    slug: string;
}

export default function DymPaper({ slug }: DymPaperProps) {
    const hoverDelay = 50; // Delay in milliseconds before extracting text
    const [textContent, setTextContent] = useState<string>('');
    const [prevContent, setprevContent] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [htmlContent, setHtmlContent] = useState<string>('');

    async function addContext(text: string, elementId: string | null) {
        console.log('Hovered Text:', text);
        console.log('From Element ID:', elementId);
        // dont add if prev = textContent
        if (prevContent === text){
            return;
        }
        setprevContent(text);
        setTextContent(prev => prev + `\n\n${text}`);

        if (!text || text.length > 1500) return; // Skip empty or too long texts
        try {
            const res = await fetch('http://localhost:8000/fastingest', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                text: textContent,
               id: slug +  elementId,
                }),
            });
            
            if (!res.ok) {
                const errorText = await res.text(); // fallback for non-JSON errors
                throw new Error(`Server error ${res.status}: ${errorText}`);
            }
            
            const data = await res.json();
            console.log('✅ Server responded:', data);
            // Remove the text from the state after sending it
            setTextContent('');
            } catch (err) {
            console.error('❌ Error calling /fastingest:', err);
            }
    }

    useEffect(() => {
        const convertPdfToHtml = async () => {
            try {
                // Construct the PDF URL based on your slug
                
                
                const response = await fetch('/api/pdfparser', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ pdfUrl :slug }),
                });
                
                const data = await response.json();
                
                if (data.error) {
                    setError(data.message || 'Error converting PDF to HTML');
                } else if (data.url) {
                    setHtmlContent(data.url);
                } else {
                    setError('No HTML content received');
                }
            } catch (err) {
                setError('Failed to convert PDF: ' + (err instanceof Error ? err.message : String(err)));
            } finally {
                setLoading(false);
            }
        };

        convertPdfToHtml();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array since slug is constant from Next.js params

    if (loading) {
        return (
            <div className="w-screen flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p>Converting PDF to HTML...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-screen flex justify-center items-center min-h-screen">
                <div className="text-red-500 text-center">
                    <h2 className="text-xl font-bold mb-2">Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen pt-[20vh] min-h-screen">
            {/* <GazeTracker /> */}
            <PaperViewer 
                paperPath={`${htmlContent ? htmlContent : '/sample-paper.html'}`}
            />
            <TextExtractor
                onExtract={({ text, elementId }) => {
                    addContext(text, elementId);
                }}
                maxItems={50}
                hoverDelay={250}
            />
        </div>
    )
}

