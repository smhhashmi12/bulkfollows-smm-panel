import React, { useState, useEffect, useMemo } from 'react';
import { servicesAPI, authAPI } from '../../lib/api';
import { isTimeoutError } from '../../lib/utils';
import type { Service, UserProfile } from '../../lib/api';

interface ServiceWithTiming extends Service {
    completion_time: number; // in hours
    time_pricing?: {
        [hours: number]: number; // hours as key, price multiplier as value
    };
}

const OrderPlacementPage: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [allServices, setAllServices] = useState<ServiceWithTiming[]>([]);
    const [selectedService, setSelectedService] = useState<ServiceWithTiming | null>(null);
    const [selectedTime, setSelectedTime] = useState<number>(24); // default 24 hours
    const [link, setLink] = useState('');
    const [quantity, setQuantity] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loadingServices, setLoadingServices] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoadingServices(true);
            try {
                const [servicesData, userProfile] = await Promise.all([
                    servicesAPI.getServices(),
                    authAPI.getUserProfile(),
                ]);
                
                // Add timing data to services
                const servicesWithTiming = servicesData.map((s: Service) => ({
                    ...s,
                    completion_time: 24, // default 24 hours
                    time_pricing: {
                        6: 2.0,   // 6 hours = 2x price
                        12: 1.5,  // 12 hours = 1.5x price
                        24: 1.0,  // 24 hours = normal price
                        48: 0.8,  // 48 hours = 0.8x price
                        72: 0.7,  // 72 hours = 0.7x price
                    }
                }));
                
                setAllServices(servicesWithTiming);
                setProfile(userProfile);
            } catch (err: any) {
                const msg = isTimeoutError(err) ? 'Request timed out. Please refresh.' : 'Failed to load services. Please refresh the page.';
                setError(msg);
                console.error('Failed to load services:', err);
            } finally {
                setLoadingServices(false);
            }
        };
        loadData();
    }, []);

    const categories = useMemo(() => {
        return [...new Set(allServices.map(s => s.category))].sort();
    }, [allServices]);

    const filteredServices = useMemo(() => {
        return selectedCategory
            ? allServices.filter(s => s.category === selectedCategory)
            : [];
    }, [selectedCategory, allServices]);

    const calculatePriceWithTime = (): number => {
        if (!selectedService || !quantity) return 0;
        const qty = parseInt(quantity) || 0;
        const basePrice = (selectedService.rate_per_1000 / 1000) * qty;
        const timePricing = selectedService.time_pricing?.[selectedTime] || 1.0;
        return basePrice * timePricing;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (!selectedService) {
            setError('Please select a service');
            setLoading(false);
            return;
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty < selectedService.min_quantity || qty > selectedService.max_quantity) {
            setError(`Quantity must be between ${selectedService.min_quantity} and ${selectedService.max_quantity}`);
            setLoading(false);
            return;
        }

        if (!link.trim()) {
            setError('Please enter a valid link');
            setLoading(false);
            return;
        }

        const totalPrice = calculatePriceWithTime();
        if (!profile || profile.balance < totalPrice) {
            setError('Insufficient balance. Please add funds first.');
            setLoading(false);
            return;
        }

        try {
            // In a real app, this would create the order with timing info
            setSuccess('Order placed successfully!');
            setLink('');
            setQuantity('');
            setSelectedService(null);
            setSelectedCategory('');
            setSelectedTime(24);
        } catch (err: any) {
            setError(err.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    if (loadingServices) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Place Order</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Category Selection */}
                <div className="lg:col-span-1">
                    <div className="bg-brand-container border border-brand-border rounded-2xl p-6 h-full">
                        <h2 className="text-lg font-bold mb-4">Categories</h2>
                        <div className="space-y-2">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        setSelectedCategory(cat);
                                        setSelectedService(null);
                                    }}
                                    className={`w-full text-left p-3 rounded-lg transition ${
                                        selectedCategory === cat
                                            ? 'bg-brand-accent text-white'
                                            : 'bg-black/20 text-gray-300 hover:bg-white/10'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Services & Order Form */}
                <div className="lg:col-span-3 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400 text-sm">
                            {success}
                        </div>
                    )}

                    {/* Services Grid */}
                    {selectedCategory && (
                        <div className="bg-brand-container border border-brand-border rounded-2xl p-6">
                            <h2 className="text-lg font-bold mb-4">{selectedCategory} Services</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredServices.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => setSelectedService(service)}
                                        className={`p-4 rounded-lg border transition text-left ${
                                            selectedService?.id === service.id
                                                ? 'bg-brand-accent/20 border-brand-accent'
                                                : 'bg-black/20 border-brand-border hover:bg-white/5'
                                        }`}
                                    >
                                        <h3 className="font-semibold text-white">{service.name}</h3>
                                        <p className="text-sm text-gray-400 mt-1">${service.rate_per_1000}/1000</p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Standard: {service.completion_time}h delivery
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Order Form */}
                    {selectedService && (
                        <div className="bg-brand-container border border-brand-border rounded-2xl p-6">
                            <h2 className="text-lg font-bold mb-6">Order Details</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Service Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Service</label>
                                    <div className="bg-black/20 border border-brand-border rounded-lg p-3">
                                        <p className="font-semibold text-white">{selectedService.name}</p>
                                        <p className="text-sm text-gray-400 mt-1">Rate: ${selectedService.rate_per_1000}/1000</p>
                                    </div>
                                </div>

                                {/* Time Selection with Dynamic Pricing */}
                                <div>
                                    <label htmlFor="order-delivery-time" className="block text-sm font-medium text-gray-300 mb-2">Delivery Time</label>
                                    <select
                                        id="order-delivery-time"
                                        name="orderDeliveryTime"
                                        value={selectedTime}
                                        onChange={(e) => setSelectedTime(parseInt(e.target.value))}
                                        className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                    >
                                        <option value={6}>6 Hours (⚡ 2x Price)</option>
                                        <option value={12}>12 Hours (🔥 1.5x Price)</option>
                                        <option value={24}>24 Hours (✓ Standard Price)</option>
                                        <option value={48}>48 Hours (💰 0.8x Price)</option>
                                        <option value={72}>72 Hours (💸 0.7x Price)</option>
                                    </select>
                                    <p className="text-xs text-gray-400 mt-2">
                                        ⏱️ Faster delivery = Higher price | Slower delivery = Lower price
                                    </p>
                                </div>

                                {/* Link Input */}
                                <div>
                                    <label htmlFor="link" className="block text-sm font-medium text-gray-300 mb-2">Link</label>
                                    <input
                                        type="url"
                                        id="link"
                                        name="orderLink"
                                        value={link}
                                        onChange={(e) => setLink(e.target.value)}
                                        placeholder="https://www.instagram.com/username"
                                        required
                                        className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                    />
                                </div>

                                {/* Quantity Input */}
                                <div>
                                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                                    <input
                                        type="number"
                                        id="quantity"
                                        name="orderQuantity"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        placeholder="500"
                                        required
                                        min={selectedService?.min_quantity || 0}
                                        max={selectedService?.max_quantity || 100000}
                                        className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                    />
                                    {selectedService && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            Range: {selectedService.min_quantity.toLocaleString()} - {selectedService.max_quantity.toLocaleString()}
                                        </p>
                                    )}
                                </div>

                                {/* Price Breakdown */}
                                {quantity && (
                                    <div className="bg-black/20 border border-brand-border rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Base Price:</span>
                                            <span className="text-white">${((selectedService.rate_per_1000 / 1000) * parseInt(quantity)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Time Multiplier ({selectedTime}h):</span>
                                            <span className="text-white">×{(selectedService.time_pricing?.[selectedTime] || 1.0).toFixed(1)}</span>
                                        </div>
                                        <div className="border-t border-brand-border pt-2 mt-2 flex justify-between font-bold">
                                            <span className="text-white">Total Price:</span>
                                            <span className="text-brand-accent text-lg">${calculatePriceWithTime().toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={loading || !selectedService || !quantity || !link}
                                    className="w-full bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold p-3 rounded-lg shadow-purple-glow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Placing Order...' : 'Place Order'}
                                </button>
                            </form>
                        </div>
                    )}

                    {!selectedCategory && (
                        <div className="bg-brand-container border border-brand-border rounded-2xl p-8 text-center text-gray-400">
                            <p>Select a category to view available services</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderPlacementPage;
