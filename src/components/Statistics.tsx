
import React from 'react';

const stats = [
    { label: 'Prices Starting From', value: '0.001$/1k', icon: '💰' },
    { label: 'Order Completed', value: '140655487', icon: '👤' },
    { label: 'An order is made every', value: '0.14Sec', icon: '⏱️' },
]

const Statistics: React.FC = () => {
    return (
        <section className="px-4 sm:px-6 lg:px-8 py-20">
            <div className="container mx-auto text-center mb-12">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Statistics of Bulkfollows</h2>
                <p className="max-w-3xl mx-auto text-gray-300 mt-4">
                    Bulkfollows clients exist all over the world, and we have over 50 million active clients with over 5000 active services. Our clients work with us because of the quality we offer.
                </p>
            </div>
            <div className="container mx-auto">
                <div className="bg-brand-container border border-brand-border rounded-2xl p-6 backdrop-blur-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        {stats.map((stat, index) => (
                            <div key={index} className="flex flex-col items-center p-4">
                                <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                                    <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-lg"></div>
                                    <div className="relative w-14 h-14 bg-black/30 rounded-full flex items-center justify-center border border-purple-500/30">
                                        <span className="text-2xl">{stat.icon}</span>
                                    </div>
                                </div>
                                <p className="text-gray-300 text-sm">{stat.label}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Statistics;
