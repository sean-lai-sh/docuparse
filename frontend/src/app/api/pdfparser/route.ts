import { NextRequest, NextResponse } from 'next/server';

interface PDFcoResponse {
  error: boolean;
  url?: string;
  jobId?: string;
  status?: string;
  html?: string;
  message?: string;
}

/**
 * API route handler for converting PDF to HTML using PDF.co API
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pdfUrl } = body;

    if (!pdfUrl) {
      return NextResponse.json(
        { error: true, message: 'A valid PDF URL needed' },
        { status: 400 }
      );
    }

    const apiKey = process.env.PDFCO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: true, message: 'PDF.co API key is not configured' },
        { status: 500 }
      );
    }
    const url = pdfUrl.startsWith('http') ? pdfUrl : `https://${pdfUrl}`;

    // Replace all , with /
    const regex = /,/g;
    const newUrl = url.replace(regex, '/');

    console.log(url)
    const payload = {
      name: 'result.html',
      password: '',
      pages: '',
      simple: false,
      columns: false,
      url: newUrl,
      async: false
    };
    console.log(payload.url)
    const response = await fetch('https://api.pdf.co/v1/pdf/convert/to/html', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: PDFcoResponse = await response.json();

    if (!response.ok || data.error) {
      return NextResponse.json(
        { error: true, message: data.message || 'PDF.co API error' },
        { status: response.status || 500 }
      );
    }

    // You can return the job ID and polling URL to check for completion
    return NextResponse.json({
      error: false,
      jobId: data.jobId,
      url: data.url,
      status: data.status || 'working'
    });
  } catch (error) {
    console.log(String(error));
    return NextResponse.json(
      { error: true, message: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
