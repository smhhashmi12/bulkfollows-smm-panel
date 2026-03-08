
import React from 'react';
import aboutDashboardIllustration from '../assets/about-dashboard.svg';

const About: React.FC = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20">
      <div className="container mx-auto text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">About Bulkfollows</h2>
      </div>
      <div className="container mx-auto grid md:grid-cols-2 gap-8">
        <div className="bg-brand-container border border-brand-border rounded-3xl p-8 flex flex-col text-left">
          <h3 className="text-2xl font-bold mb-4">World's Best Cheap & Easy Smm Panel</h3>
          <p className="text-gray-300 mb-6">
            Bulkfollows is a globally recognized platform offering top-notch SMM services. Whether you're in the United States, India, or Turkey, you can access our services anywhere, anytime. Our panel is designed to be user-friendly and cost-effective, providing the best value for your money.
          </p>
          <div className="mt-auto bg-black/30 rounded-2xl p-4 border border-brand-border flex-grow flex items-center justify-center">
             <img
               src={aboutDashboardIllustration}
               alt="Bulkfollows Dashboard"
               className="rounded-lg object-cover"
               loading="lazy"
               decoding="async"
             />
          </div>
        </div>
        <div className="bg-brand-container border border-brand-border rounded-3xl p-8 flex flex-col text-left">
            <div className="bg-black/30 rounded-2xl p-6 border border-brand-border flex-grow flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold">Bulkfollows</span>
                    <div className="flex space-x-1">
                        <span className="w-3 h-3 bg-gray-600 rounded-full"></span>
                        <span className="w-3 h-3 bg-gray-600 rounded-full"></span>
                        <span className="w-3 h-3 bg-gray-600 rounded-full"></span>
                    </div>
                </div>
                <div className="bg-white/10 p-4 rounded-lg text-left text-sm space-y-3">
                    <p>Views - Retention 1-2 Mins - Source</p>
                    <div className="flex items-center space-x-4">
                        <div className="w-4 h-4 rounded-full border-2 border-brand-purple bg-purple-500/30"></div>
                        <p>Views</p>
                        <button className="ml-auto bg-brand-accent text-white px-3 py-1 text-xs rounded-md">Buy Now</button>
                    </div>
                    <p>Followers [ Flag OF ]</p>
                    <div className="flex items-center space-x-4">
                        <div className="w-4 h-4 rounded-full border-2 border-brand-purple"></div>
                        <p>Buy Followers</p>
                        <button className="ml-auto bg-gray-500 text-white px-3 py-1 text-xs rounded-md">Resell Service</button>
                    </div>
                     <div className="flex items-center space-x-2 text-gray-300">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                        <span>Add to Favorite</span>
                     </div>
                </div>
            </div>
          <h3 className="text-2xl font-bold mt-8 mb-4">Smm Reseller Panel</h3>
          <p className="text-gray-300">
            Our reseller panel allows influencers, marketing enthusiasts, and digital marketing agencies to buy our services at wholesale prices. Whether it's Twitter followers, Soundcloud likes, or YouTube views, you can resell them at a profit.
          </p>
        </div>
      </div>
    </section>
  );
};

export default About;
