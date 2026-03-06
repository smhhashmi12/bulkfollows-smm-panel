import React from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import About from '../components/About';
import Benefits from '../components/Benefits';
import Services from '../components/Services';
import Testimonials from '../components/Testimonials';
import SmmPanelServices from '../components/SmmPanelServices';
import Features from '../components/Features';
import Statistics from '../components/Statistics';
import WhyChooseUs from '../components/WhyChooseUs';
import Faq from '../components/Faq';
import Cta from '../components/Cta';
import Footer from '../components/Footer';
import { User } from '../App';

interface LandingPageProps {
  currentUser: User | null;
  onLogout: () => void;
  onLoginSuccess: (user: User) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ currentUser, onLogout, onLoginSuccess }) => {
  return (
    <div className="bg-brand-dark ds-noise text-white font-sans overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#1a0a36] to-brand-dark z-0"></div>
      <div className="absolute top-0 left-0 w-full h-[500px] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,81,255,0.2),rgba(255,255,255,0))]"></div>
      
      <div className="relative z-10">
        <Header currentUser={currentUser} onLogout={onLogout} />
        <main>
          <Hero onLoginSuccess={onLoginSuccess} />
          <About />
          <Benefits />
          <Services />
          <Testimonials />
          <SmmPanelServices />
          <Features />
          <Statistics />
          <WhyChooseUs />
          <Faq />
          <Cta />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;
