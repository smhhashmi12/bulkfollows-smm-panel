
import React, { useState } from 'react';

const servicesTabs = ['Youtube', 'Twitter', 'Linkedin', 'Telegram', 'Spotify', 'Soundcloud'];

const serviceContent = {
  Youtube: {
    title: 'Youtube Smm Panel',
    description: 'Want to skyrocket your YouTube channel\'s growth? Our YouTube SMM panel offers views, likes, subscribers, and shares from genuine accounts. Become an internet celebrity with our services. Users are constantly looking for fresh and appealing videos due to the constantly rising volume of videos submitted to YouTube.'
  },
  Twitter: {
    title: 'Twitter Smm Panel',
    description: 'Boost your Twitter presence with our targeted services. Get more followers, retweets, and likes to expand your reach and influence on the platform.'
  },
  Linkedin: {
    title: 'Linkedin Smm Panel',
    description: 'Enhance your professional network on LinkedIn. We provide services to increase your connections, post engagement, and company page followers.'
  },
  Telegram: {
    title: 'Telegram Smm Panel',
    description: 'Grow your Telegram channels and groups with our reliable services. Increase members, post views, and engagement to build a thriving community.'
  },
  Spotify: {
    title: 'Spotify Smm Panel',
    description: 'Get your music heard on Spotify. Our services help you gain more plays, followers, and playlist placements to boost your artist profile.'
  },
  Soundcloud: {
    title: 'Soundcloud Smm Panel',
    description: 'Promote your tracks on Soundcloud. We offer plays, likes, reposts, and comments to help you reach a wider audience and get discovered.'
  },
};

const Services: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Youtube');

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20">
      <div className="container mx-auto text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Smm Services</h2>
        <p className="max-w-3xl mx-auto text-gray-300 mt-4">
          Our wide range of SMM services covers all major social networks such as Soundcloud, Twitter, Spotify, Youtube, Linkedin, and Telegram. Here's what you can expect:
        </p>
      </div>
      <div className="container mx-auto bg-brand-container border border-brand-border rounded-3xl p-8 backdrop-blur-sm">
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {servicesTabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                activeTab === tab 
                  ? 'bg-gradient-to-r from-brand-accent to-brand-purple text-white shadow-purple-glow-sm' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="text-center">
          <h3 className="text-3xl font-bold mb-4">{serviceContent[activeTab as keyof typeof serviceContent].title}</h3>
          <p className="max-w-3xl mx-auto text-gray-300">
            {serviceContent[activeTab as keyof typeof serviceContent].description}
          </p>
        </div>
      </div>
    </section>
  );
};

export default Services;
