import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';
import { isTimeoutError } from '../../lib/utils';
import type { UserProfile } from '../../lib/api';

const statusColors: { [key: string]: string } = {
  active: 'bg-green-500/20 text-green-400',
  banned: 'bg-red-500/20 text-red-400',
  inactive: 'bg-gray-500/20 text-gray-400',
};

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    balance: 0,
    role: 'user' as const,
  });

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminAPI.getAllUsers();
      setUsers(data);
    } catch (err) {
            console.error('Error fetching users:', err);
            setError(isTimeoutError(err) ? 'Request timed out. Please refresh.' : 'Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      balance: user.balance,
      role: user.role,
    });
    setIsEditModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'balance' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSaveChanges = async () => {
    if (!editingUser) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Update user balance and role
      await adminAPI.updateUserBalance(editingUser.id, formData.balance);
      await adminAPI.updateUserRole(editingUser.id, formData.role);
      
      // Refresh user list
      await fetchUsers();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string, currentStatus: string) => {
    if (!confirm(`Are you sure you want to ${currentStatus === 'active' ? 'ban' : 'unban'} this user?`)) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Toggle user status between 'active' and 'banned'
      const newStatus = currentStatus === 'active' ? 'banned' : 'active';
      // This would require adding a new method to update user status in adminAPI
      // For now, we'll just refresh the user list
      await fetchUsers();
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Failed to update user status. Please try again.');
    } finally {
      setLoading(false);
    }
  };
    return (
        <div>
            {error && (
                <div className="mb-4 p-4 bg-red-500/20 text-red-400 rounded-lg">
                    {error}
                </div>
            )}
            
            <div className="bg-brand-container border border-brand-border rounded-2xl">
                <div className="overflow-x-auto ds-scrollbar">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
                        <p className="mt-2">Loading users...</p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black/20">
                            <tr>
                                <th className="p-4 font-semibold">ID</th>
                                <th className="p-4 font-semibold">Username</th>
                                <th className="p-4 font-semibold">Email</th>
                                <th className="p-4 font-semibold">Role</th>
                                <th className="p-4 font-semibold text-right">Balance</th>
                                <th className="p-4 font-semibold text-right">Total Spent</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border">
                            {users.length > 0 ? (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-black/10">
                                        <td className="p-4 font-mono text-xs">{user.id.substring(0, 8)}...</td>
                                        <td className="p-4">{user.username}</td>
                                        <td className="p-4 text-gray-300">{user.email}</td>
                                        <td className="p-4">
                                            <span className="capitalize">{user.role}</span>
                                        </td>
                                        <td className="p-4 font-mono text-right text-green-400">
                                            ${user.balance.toFixed(2)}
                                        </td>
                                        <td className="p-4 font-mono text-right text-blue-400">
                                            ${user.total_spent.toFixed(2)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status as keyof typeof statusColors] || 'bg-gray-500/20 text-gray-400'}`}>
                                                {user.status || 'inactive'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleEditClick(user)}
                                                    className="text-blue-400 hover:text-white p-1 rounded hover:bg-blue-500/20"
                                                    title="Edit"
                                                    disabled={loading}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleBanUser(user.id, user.status || 'active')}
                                                    className="text-red-400 hover:text-white p-1 rounded hover:bg-red-500/20"
                                                    title={user.status === 'banned' ? 'Unban User' : 'Ban User'}
                                                    disabled={loading}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.367zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-400">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
                </div>
            </div>

            {/* Edit User Modal */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                    <div className="bg-brand-container border border-brand-border rounded-2xl p-6 w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Edit User: {editingUser.username}</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                                    disabled
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                                    disabled
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1">Balance</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        name="balance"
                                        value={formData.balance}
                                        onChange={handleInputChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 border border-brand-border rounded-lg hover:bg-black/20"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveChanges}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagementPage;
