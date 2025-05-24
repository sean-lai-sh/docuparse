'use client'
import React, { useEffect, useState } from 'react'
import {motion, Variants} from 'framer-motion'

const AgentPanel = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [showThinking, setShowThinking] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [content, setContent] = useState<string>('');

    useEffect(() => {
        const handleScroll = () => {
        if (window.scrollY > 10) {
            setIsScrolled(true);
        } else {
            setIsScrolled(false);
        }
        };
        let mounted = true;

        const loop = async () => {
        while (mounted) {
            try {
            // Simulate API call
            const res = await fetch(`http://localhost:8000/query`,{
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: 'Help me understand the paper and analyze the meaning of important semantics?',
                  
                }),
            });
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            console.log('API Response:', data);
            console.log(data.answer)
            if(!data.answer){
                console.warn('No answer received from API');
            }else{
                console.log('Received answer:', data.answer);
            }
            // Update content state
            setContent(data.answer || 'No content available');
            console.log('Content updated:', content);
            // Arbitrary delay
            await new Promise(res => setTimeout(res, 1000));

            // Toggle state
            setIsOpen(prev => !prev);
            setShowThinking(prev => !prev);
            } catch (err) {
            console.warn('Error during async loop:', err);
            }

            // Wait before next cycle
            await new Promise(res => setTimeout(res, 3000));
        }
        };
        loop();
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll)
            mounted = false; // Cleanup to stop the loop
        }
        ;
    }, []);
    return (
        <div className={`w-screen fixed top-[10vh] z-50 ${isScrolled ? ' opacity-100' : 'opacity-0'} transition-all duration-1000 linear `}>
            <div className='w-48 h-[3.25rem] rounded-t-full bg-blue-600/40 flex items-center justify-center shadow-md shadow-black ml-2'>
                <div className='inset-2 h-10 bg-gradient-to-tr from-slate-600 to-black flex flex-row w-[95%] items-center rounded-t-full  '>
                    <div className='w-5 h-5 rounded-full bg-gradient-to-tr from-white to-slate-700 ml-2'/>
                    <ThinkingDots isThinking={isOpen} showThinking={showThinking}/>
                </div>
            </div>
            <div className='max-w-[20vw] w-full bg-black h-[40vh] text-white'>
                {content}
            </div>
        </div>
    )
}

export default AgentPanel


function ThinkingDots({ isThinking, showThinking }: { isThinking: boolean, showThinking?: boolean }) {
  const getVariant = () => {
    if (isThinking) return 'thinking';
    if (showThinking) return 'subtle';
    return 'idle';
  };

  const dotVariants: Variants = {
    initial: { y: 0,x:0 },
  
    thinking: (custom: number) => ({
      y: [0, -10, 0, 0],
      transition: {
        duration: 0.8,
        repeat: Infinity,
        ease: 'easeIn',
        times: [0, 0.1, 0.3, 1],
        delay: custom,
      },
    }),
  
    subtle: (custom: number) => ({
      x: [0, 100 + (3 - custom) * 75],
      transition: {
        duration: 1.2,
       
        ease: 'easeInOut',
      },
    }),
  
    idle: { y: 0 },
  }

  return (
    <div className="flex gap-2 items-end ml-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 h-1 rounded-full bg-white"
          variants={dotVariants}
          initial="initial"
          animate={getVariant()}
          custom={i*0.15}
        />
      ))}
    </div>
  );
}
