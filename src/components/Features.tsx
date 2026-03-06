
import React from 'react';

const features = [
  { title: 'Support 24/7', description: 'Our top priority is to satisfy our customers. That\'s why our SMM Panel 24/7 Support is available for our customers to assist you with your queries and concerns.' },
  { title: 'Quick Response from Clients', description: 'Our client\'s feedback is important to us. That\'s why we strive to respond to our clients as quickly as possible. This helps us maintain a strong relationship.' },
  { title: 'Social Media Marketing Service', description: 'Social Media Marketing Panel is an essential aspect of digital marketing today. With our range of SMM services, we strive to help businesses expand their online presence.' },
  { title: 'Achievements', description: 'We\'re proud of our achievements. Our panel has been used by thousands of clients worldwide. An order is placed every 0.3 seconds on our platform.' },
];

const Features: React.FC = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20">
      <div className="container mx-auto relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-px h-full bg-purple-500/20"></div>
          <div className="h-px w-full bg-purple-500/20 absolute"></div>
          <div className="w-48 h-48 rounded-full bg-purple-900/20 absolute blur-3xl"></div>
        </div>
        <div className="relative w-24 h-24 bg-brand-accent rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-purple-glow rotate-45">
            <div className="-rotate-45">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
            </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8 relative">
          {features.map((feature, index) => (
            <div key={index} className="p-6 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
