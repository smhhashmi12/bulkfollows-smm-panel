
import React from 'react';
import worldMapIllustration from '../assets/world-map.svg';

const panelServices = [
    { title: 'X smm panel', description: 'Boost your X presence with our X SMM services. Get more likes, shares, and followers.' },
    { title: 'Spotify Smm Panel', description: 'Expand your Spotify reach with our Spotify SMM services. Get more likes, followers and Views.' },
    { title: 'Youtube Smm Panel', description: 'Skyrocket your Youtube channel\'s growth with our Youtube SMM services. Get more views, likes, and subscribers.' },
];

const SmmPanelServices: React.FC = () => {
    return (
        <section className="px-4 sm:px-6 lg:px-8 py-20">
            <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center">
                <div className="text-left">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6">Cheapest Smm Reseller Panel</h2>
                    <div className="relative">
                        <img
                            src={worldMapIllustration}
                            alt="World Map"
                            className="w-full"
                            fetchpriority="low"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-6">
                    {panelServices.map((service, index) => (
                        <div key={index} className="bg-brand-container border border-brand-border rounded-2xl p-6 backdrop-blur-sm">
                            <h3 className="text-xl font-bold mb-2">{service.title}</h3>
                            <p className="text-gray-300">{service.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default SmmPanelServices;
