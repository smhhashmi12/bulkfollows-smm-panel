
import React from 'react';

const WhyChooseUs: React.FC = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20">
      <div className="container mx-auto grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-brand-container border border-brand-border rounded-3xl p-8 backdrop-blur-sm">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">Why should you choose Bulkfollows?</h2>
          <p className="text-gray-300 mb-4">
            Bulkfollows offers its clients results-oriented services that last forever if you are looking for a YouTube SMM panel to increase YouTube watch time or you need YouTube views, likes or subscribers.
          </p>
          <p className="text-gray-300 mb-6">
            Then you are in the right place because here you can find the cheapest SMM packages for your YouTube channel or videos. We offer all major payment methods like Paypal, Paytm, Bitcoin, Jazzcash, Easy Paisa, etc, to complete the process in the most secure way. Bulkfollows build trust with their customers, which is why they keep us in their good book for their future needs.
          </p>
          <button className="bg-white/10 px-6 py-3 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-2">
            <span>Read more</span>
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <div className="flex flex-col gap-8">
          <div className="bg-brand-container border border-brand-border rounded-3xl p-8 backdrop-blur-sm">
            <h3 className="font-bold text-xl mb-2">Quality Service Guarantee</h3>
            <p className="text-gray-300 text-sm">The standard of our services is very high because our SMM Panel team is very dedicated and well-trained.</p>
          </div>
          <div className="bg-brand-container border border-brand-border rounded-3xl p-8 backdrop-blur-sm">
            <h3 className="font-bold text-xl mb-2">24/7 Support Service</h3>
            <p className="text-gray-300 text-sm">The Bulkfollows support team is well-trained and always ready to help you with everything.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
