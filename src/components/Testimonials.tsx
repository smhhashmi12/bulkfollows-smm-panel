
import React from 'react';
import { getAvatarDataUri } from '../lib/avatar';

const testimonials = [
  { name: 'Melissa Smith', metric: '321514 Followers' },
  { name: 'Michael John', metric: '50M Subscribers' },
  { name: 'Isabella', metric: '132512 Listeners' },
];

const Testimonials: React.FC = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20">
      <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="flex flex-col gap-4">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-brand-container border border-brand-border rounded-xl p-4 flex items-center justify-between shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <img
                  src={getAvatarDataUri(testimonial.name)}
                  alt={testimonial.name}
                  className="w-16 h-16 rounded-full border-2 border-brand-purple"
                  fetchpriority="low"
                  loading="lazy"
                  decoding="async"
                />
                <div>
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    {testimonial.name}
                  </h4>
                  <p className="text-gray-300 text-xl font-bold">{testimonial.metric}</p>
                </div>
              </div>
              <button className="bg-brand-accent p-2 rounded-full text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
              </button>
            </div>
          ))}
        </div>
        <div className="text-left">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6">Superior Smm Panel To Boost Your Social Media Accounts</h2>
          <p className="text-gray-300 mb-8">
            Bulkfollows is a real booster for your social media accounts. We work hard to create results-driven strategies to generate social media activities organically. Our packages are very cheap, and we have created all kinds of packages for small, medium and large businesses. Try the Bulkfollows Marketing Panel for your social media growth.
          </p>
          <div className="flex gap-4">
            <button className="bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button className="bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
