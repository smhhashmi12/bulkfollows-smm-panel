
import React, { useState } from 'react';

const faqData = [
  { question: "How to Register?", answer: "Simply click on the 'Sign Up' button, fill in your details, and you're good to go. The process takes less than a minute." },
  { question: "How Bulkfollows can help you make money?", answer: "Bulkfollows offers reseller panels, allowing you to sell our SMM services to your own clients at a profit. We provide the services, you set the price." },
  { question: "How to Add Funds?", answer: "Navigate to the 'Add Funds' section in your dashboard. We support various payment methods including credit cards, PayPal, and cryptocurrencies for your convenience." },
  { question: "Do we offer Targeted smm panel services?", answer: "Yes, many of our services offer targeting options, such as by country or demographic, to ensure you reach the right audience." },
  { question: "How to Place an Order?", answer: "Go to the 'New Order' page, select a category and service, enter the link and quantity, and submit. Your order will be processed instantly." },
  { question: "Why Choose Bulkfollows?", answer: "We offer the highest quality services at the most competitive prices, with 24/7 customer support and a user-friendly platform." },
];

const FaqItem: React.FC<{ question: string; answer: string; isOpen: boolean; onClick: () => void }> = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className="bg-brand-container border border-brand-border rounded-2xl overflow-hidden backdrop-blur-sm">
      <button onClick={onClick} className="w-full flex justify-between items-center text-left p-6">
        <span className="font-semibold">{question}</span>
        <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </span>
      </button>
      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40' : 'max-h-0'}`}>
        <div className="px-6 pb-6 text-gray-300">
          <p>{answer}</p>
        </div>
      </div>
    </div>
  );
};

const Faq: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="px-4 sm:px-6 lg:px-8 py-20">
      <div className="container mx-auto text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Frequently Asked Question</h2>
      </div>
      <div className="container mx-auto max-w-4xl">
        <div className="grid md:grid-cols-2 gap-6">
          {faqData.map((item, index) => (
            <FaqItem
              key={index}
              question={item.question}
              answer={item.answer}
              isOpen={openIndex === index}
              onClick={() => handleToggle(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Faq;
