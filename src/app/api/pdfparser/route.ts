import { NextRequest, NextResponse } from 'next/server';

// Define the response type from PDF.co API
interface PDFcoResponse {
  error: boolean;
  url?: string;
  jobId?: string;
  status?: string;
  html?: string;
}

/**
 * API route handler for converting PDF to HTML using PDF.co API
 * @param req NextRequest object containing the URL of the PDF to convert
 * @returns NextResponse with HTML content or error message
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the request body to get the PDF URL
    const body = await req.json();
    const { pdfUrl } = body;

    // Validate input
    if (!pdfUrl) {
      return NextResponse.json(
        { error: true, message: 'PDF URL is required' },
        { status: 400 }
      );
    }
    
    // Get API key from environment variable
    const apiKey = process.env.PDFCO_API_KEY;
    
    // Validate API key
    if (!apiKey) {
      return NextResponse.json(
        { error: true, message: 'PDF.co API key is not configured' },
        { status: 500 }
      );
    }
    console.log('PDF URL:', pdfUrl);
    // Prepare the request to PDF.co API
    const pdfcoEndpoint = 'https://api.pdf.co/v1/pdf/convert/to/html';
    
    // Set up the request payload
    const payload = {
      url: pdfUrl,
      inline: true, // Return HTML content directly in the response
      async: false, // Process synchronously for simplicity
    };

    // Call the PDF.co API
    const response = await fetch(pdfcoEndpoint, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Parse the response
    const data: PDFcoResponse = await response.json();
    console.log('PDF.co API response:', data);
    // Handle API errors
    if (data.error) {
      return NextResponse.json(
        { error: true, message: 'PDF.co API error', details: data },
        { status: 500 }
      );
    }

    // If inline is true, the HTML content should be in the response
    if (data.html) {
      return NextResponse.json({ 
        error: false, 
        html: data.html 
      });
    }
    
    // If inline is false or not specified, the URL to the HTML file will be returned
    else if (data.url) {
      // Fetch the HTML content from the URL
      const htmlResponse = await fetch(data.url);
      const htmlContent = await htmlResponse.text();
      
      return NextResponse.json({ 
        error: false, 
        html: htmlContent,
        url: data.url
      });
    }
    
    // Handle asynchronous job
    else if (data.jobId) {
      return NextResponse.json({ 
        error: false, 
        message: 'Conversion started', 
        jobId: data.jobId,
        status: data.status
      });
    }
    
    // Fallback for unexpected response format
    return NextResponse.json(
      { error: true, message: 'Unexpected response format from PDF.co API', data },
      { status: 500 }
    );
    
  } catch (error) {
    console.error('Error converting PDF to HTML:', error);
    return NextResponse.json(
      { error: true, message: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
