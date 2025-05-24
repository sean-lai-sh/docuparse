'use client'
import React, { useEffect, useState } from 'react'
import {motion} from 'framer-motion'

const AgentPanel = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
        if (window.scrollY > 10) {
            setIsScrolled(true);
        } else {
            setIsScrolled(false);
        }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    return (
        <div className={`w-screen fixed top-[10vh] z-50 ${isScrolled ? ' opacity-100' : 'opacity-0'} transition-all duration-1000 linear `}>
            <div className='w-48 h-[3.25rem] rounded-full bg-blue-600/40 flex items-center justify-center shadow-md shadow-black ml-2'>
                <div className='inset-2 h-10 bg-gradient-to-tr from-slate-600 to-black flex flex-row w-[95%] items-center rounded-full'>
                    <div className='w-5 h-5 rounded-full bg-gradient-to-tr from-white to-slate-700 ml-2'/>
                    <ThinkingDots isThinking={isOpen} />
                </div>
            </div>
            <div>

            </div>
        </div>
    )
}

export default AgentPanel


function ThinkingDots({ isThinking }: { isThinking: boolean }) {
    const bounce = {
        y: [0, -10, 0, 0], // last 0 adds a pause at bottom
      };
    
      const transition = {
        duration: 0.8,
        repeat: Infinity,
        ease: 'easeInOut',
        times: [0, 0.1, 0.3, 1], // controls keyframe pacing
      };

  return (
    <div className="flex gap-2 items-end px-5">
      <motion.div
        className="w-1 h-1 rounded-full bg-white"
        animate={isThinking ? bounce : { y: 0 }}
        transition={{ ...transition, delay: 0 }}
      />
      <motion.div
        className="w-1 h-1 rounded-full bg-white"
        animate={isThinking ? bounce : { y: 0 }}
        transition={{ ...transition, delay: 0.1 }}
      />
      <motion.div
        className="w-1 h-1 rounded-full bg-white"
        animate={isThinking ? bounce : { y: 0 }}
        transition={{ ...transition, delay: 0.2 }}
      />
    </div>
  );
}
