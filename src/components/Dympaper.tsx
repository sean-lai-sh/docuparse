'use client'
import PaperViewer from './PaperViewer'

export default function DymPaper({slug}:{slug:string}){


    return(
        <div className="w-full min-h-screen">
            <PaperViewer paperPath={`/${slug}`}/>
        </div>
    )
}