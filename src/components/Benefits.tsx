
import React from 'react';

const benefitItems = [
  { icon: '🛡️', title: 'Secure Payment SMM Panel', description: 'We accept payments through various methods like credit cards, PayPal, Payoneer, Skrill, Western Union, and more. Our payment gateway is secure and ensures that your money is safe.' },
  { icon: '📊', title: 'SMM Panel with Real-Time Data', description: 'We provide real-time data and statistics about your orders and services. This helps you keep track of your social media growth and understand what\'s working for your brand.' },
  { icon: '🏆', title: 'Highest Quality SMM Panel', description: 'Quality is our top priority. Our SMM services are 100% genuine, safe, and compliant with each social network\'s terms and services. We ensure that our services help enhance your online reputation.' },
  { icon: '🚀', title: 'Fastest SMM Panel', description: 'Our panel is built to deliver results quickly. We understand that in the world of social media, timing is everything. That\'s why we ensure your orders are processed as fast as possible.' },
];

const BenefitCard: React.FC<{ icon: string; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="bg-brand-container border border-brand-border rounded-3xl p-8 text-center flex flex-col items-center backdrop-blur-sm transform hover:-translate-y-2 transition-transform duration-300">
    <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl"></div>
        <div className="relative w-20 h-20 bg-black/30 rounded-full flex items-center justify-center border-2 border-purple-500/30">
            <span className="text-3xl">{icon}</span>
        </div>
    </div>
    <h3 className="text-xl font-bold mb-4">{title}</h3>
    <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
  </div>
);

const Benefits: React.FC = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20">
      <div className="container mx-auto text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Benefits of Using Bulkfollows</h2>
      </div>
      <div className="container mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {benefitItems.map((item, index) => (
          <BenefitCard key={index} {...item} />
        ))}
      </div>
    </section>
  );
};

export default Benefits;
