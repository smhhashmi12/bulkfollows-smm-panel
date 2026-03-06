
import React from 'react';

const Cta: React.FC = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20">
      <div className="container mx-auto text-center relative">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(138,43,226,0.3),rgba(255,255,255,0))] -z-10"></div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Get Registered to Check our <br /> Whole Website</h2>
        <p className="max-w-3xl mx-auto text-gray-300 mt-6 mb-10">
          Bulkfollows offers a wide range of services to make your marketing campaign easier. Our cheapest and performance oriented packages can improve your social media visibility and increase your income. We always promise effective growth in the world of social networks at an affordable price.
        </p>
        <button className="bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold px-8 py-4 rounded-lg shadow-purple-glow">
          Register Now
        </button>
      </div>
    </section>
  );
};

export default Cta;
