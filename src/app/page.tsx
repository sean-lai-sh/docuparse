'use client'

import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import FeaturesSection from '@/components/FeaturesSection'
import HowItWorksSection from '@/components/HowItWorksSection'
import TestimonialsSection from '@/components/TestimonialsSection'
import PricingSection from '@/components/PricingSection'
import NewsletterSection from '@/components/NewsletterSection'
import Footer from '@/components/Footer'
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    // Simulate AOS (Animate on Scroll) functionality
    const handleScroll = () => {
      const elements = document.querySelectorAll('[data-aos]')
      elements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top
        const windowHeight = window.innerHeight
        
        if (elementPosition < windowHeight - 100) {
          element.classList.add('aos-animate')
        }
      })
    }
    
    window.addEventListener('scroll', handleScroll)
    // Initial check for elements in view
    setTimeout(handleScroll, 100)
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <main className="font-sans text-gray-900 antialiased">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <NewsletterSection />
      <Footer />
    </main>
  )
}