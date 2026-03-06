import React, { useEffect, useState } from 'react';
import { adminAPI, Service } from '../../lib/api';
import { isTimeoutError } from '../../lib/utils';

const statusColors: { [key: string]: string } = {
  active: 'bg-green-500/20 text-green-400',
  inactive: 'bg-red-500/20 text-red-400',
};

const ServiceManagementPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    rate_per_1000: 0,
    min_quantity: 0,
    max_quantity: 10000,
    status: 'active' as 'active' | 'inactive',
    description: '',
  });

  // Fetch services on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminAPI.getAllServices();
      setServices(data);
    } catch (err: any) {
      const msg = isTimeoutError(err) ? 'Request timed out. Please refresh.' : 'Error fetching services';
      console.error('Error fetching services:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('quantity') || name.includes('rate') ? parseFloat(value) || 0 : value,
    }));
  };
  const handleOpenModal = (service: Service | null = null) => {
    if (service) {
      setCurrentService(service);
      setFormData({
        name: service.name,
        category: service.category,
        rate_per_1000: service.rate_per_1000,
        min_quantity: service.min_quantity,
        max_quantity: service.max_quantity,
        status: service.status,
        description: service.description || '',
      });
    } else {
      setCurrentService(null);
      setFormData({
        name: '',
        category: '',
        rate_per_1000: 0,
        min_quantity: 0,
        max_quantity: 10000,
        status: 'active',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.min_quantity >= formData.max_quantity) {
      setError('Minimum quantity must be less than maximum quantity');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      if (currentService) {
        // Update existing service
        await adminAPI.updateService(currentService.id, formData);
      } else {
        // Create new service
        await adminAPI.createService(formData);
      }
      
      await fetchServices();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving service:', err);
      setError('Failed to save service. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (service: Service) => {
    if (!confirm(`Are you sure you want to ${service.status === 'active' ? 'deactivate' : 'activate'} this service?`)) {
      return;
    }
    
    try {
      const newStatus = service.status === 'active' ? 'inactive' : 'active';
      await adminAPI.updateService(service.id, { ...service, status: newStatus });
      await fetchServices();
    } catch (err: any) {
      console.error('Error updating service status:', err);
      setError('Failed to update service status. Please try again.');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      await adminAPI.deleteService(serviceId);
      await fetchServices();
    } catch (err: any) {
      console.error('Error deleting service:', err);
      setError('Failed to delete service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end items-center mb-6">
        <button 
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 text-white font-semibold px-4 py-2 rounded-lg"
        >
          Add New Service
        </button>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="bg-brand-container border border-brand-border rounded-2xl">
        <div className="overflow-x-auto ds-scrollbar">
          {loading && services.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="mt-2">Loading services...</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-black/20">
                <tr>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold text-right">Rate (per 1k)</th>
                  <th className="p-4 font-semibold text-center">Min/Max</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {services.length > 0 ? (
                  services.map(service => (
                    <tr key={service.id} className="hover:bg-black/10">
                      <td className="p-4 font-medium">{service.name}</td>
                      <td className="p-4 text-gray-300">{service.category}</td>
                      <td className="p-4 font-mono text-right text-green-400">
                        ${service.rate_per_1000.toFixed(4)}
                      </td>
                      <td className="p-4 text-center text-gray-300 font-mono">
                        {service.min_quantity} / {service.max_quantity}
                      </td>
                      <td className="p-4">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[service.status] || 'bg-gray-500/20 text-gray-400'}`}
                        >
                          {service.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(service)}
                            className="text-blue-400 hover:text-white p-1 rounded hover:bg-blue-500/20"
                            title="Edit"
                            disabled={loading}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(service)}
                            className={`p-1 rounded ${service.status === 'active' ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-green-400 hover:bg-green-500/20'}`}
                            title={service.status === 'active' ? 'Deactivate' : 'Activate'}
                            disabled={loading}
                          >
                            {service.status === 'active' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.367zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                          <button 
                            onClick={() => handleDeleteService(service.id)}
                            className="text-red-400 hover:text-white p-1 rounded hover:bg-red-500/20"
                            title="Delete"
                            disabled={loading}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      No services found. Create your first service to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed  inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="backdrop-filter: blur(var(--blur-md)) bg-brand-container border border-brand-border rounded-2xl p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">
              {currentService ? 'Edit Service' : 'Add New Service'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Service Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Rate per 1,000 *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      name="rate_per_1000"
                      value={formData.rate_per_1000}
                      onChange={handleInputChange}
                      step="0.0001"
                      min="0"
                      className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum Quantity *</label>
                  <input
                    type="number"
                    name="min_quantity"
                    value={formData.min_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Maximum Quantity *</label>
                  <input
                    type="number"
                    name="max_quantity"
                    value={formData.max_quantity}
                    onChange={handleInputChange}
                    min={formData.min_quantity + 1}
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-brand-border rounded-lg hover:bg-black/20"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {currentService ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>{currentService ? 'Update Service' : 'Create Service'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ServiceManagementPage;
