import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';

interface Announcement {
    id: string;
    subject: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    status: 'draft' | 'published' | 'archived';
    created_at: string;
}

const typeColors: { [key: string]: { bg: string; border: string; text: string } } = {
    info: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400' },
    warning: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-400' },
    success: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400' },
};

const AnnouncementsPage: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        type: 'info' as 'info' | 'warning' | 'success',
        status: 'published' as 'draft' | 'published' | 'archived',
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Load announcements from database
    useEffect(() => {
        const loadAnnouncements = async () => {
            try {
                const data = await adminAPI.getAllAnnouncements();
                setAnnouncements(data || []);
            } catch (error) {
                console.error('Failed to load announcements:', error);
            } finally {
                setLoading(false);
            }
        };
        loadAnnouncements();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            if (editingId) {
                // Update existing announcement
                const updated = await adminAPI.updateAnnouncement(editingId, {
                    ...formData,
                    updated_at: new Date().toISOString(),
                });
                setAnnouncements(prev => prev.map(a =>
                    a.id === editingId ? updated : a
                ));
                setEditingId(null);
            } else {
                // Create new announcement
                const newAnnouncement = await adminAPI.createAnnouncement(formData);
                setAnnouncements(prev => [newAnnouncement, ...prev]);
            }

            setFormData({ subject: '', message: '', type: 'info', status: 'published' });
            setShowForm(false);
            alert(editingId ? 'Announcement updated successfully!' : 'Announcement created successfully!');
        } catch (error) {
            console.error('Failed to save announcement:', error);
            alert('Failed to save announcement. Please try again.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this announcement?')) {
            try {
                await adminAPI.deleteAnnouncement(id);
                setAnnouncements(prev => prev.filter(a => a.id !== id));
                alert('Announcement deleted successfully!');
            } catch (error) {
                console.error('Failed to delete announcement:', error);
                alert('Failed to delete announcement. Please try again.');
            }
        }
    };

    const handleEdit = (announcement: Announcement) => {
        setFormData({
            subject: announcement.subject,
            message: announcement.message,
            type: announcement.type,
            status: announcement.status,
        });
        setEditingId(announcement.id);
        setShowForm(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-end items-center mb-6">
                <button
                    onClick={() => {
                        if (showForm) {
                            setShowForm(false);
                            setEditingId(null);
                            setFormData({ subject: '', message: '', type: 'info', status: 'published' });
                        } else {
                            setShowForm(true);
                        }
                    }}
                    className="bg-brand-accent text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition"
                >
                    {showForm ? '✕ Cancel' : '+ New Announcement'}
                </button>
            </div>

            {showForm && (
                <div className="bg-brand-container border border-brand-border rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit Announcement' : 'Create New Announcement'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="announcement-subject" className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                            <input
                                type="text"
                                id="announcement-subject"
                                name="announcementSubject"
                                value={formData.subject}
                                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                                placeholder="Announcement subject"
                                required
                                className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                            />
                        </div>

                        <div>
                            <label htmlFor="announcement-message" className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                            <textarea
                                id="announcement-message"
                                name="announcementMessage"
                                value={formData.message}
                                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                                placeholder="Announcement message"
                                required
                                rows={4}
                                className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="announcement-type" className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                                <select
                                    id="announcement-type"
                                    name="announcementType"
                                    value={formData.type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                                    className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                >
                                    <option value="info">Info</option>
                                    <option value="warning">Warning</option>
                                    <option value="success">Success</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="announcement-status" className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                                <select
                                    id="announcement-status"
                                    name="announcementStatus"
                                    value={formData.status}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                    className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-brand-accent text-white font-semibold p-3 rounded-lg hover:opacity-90 transition"
                        >
                            {editingId ? 'Update Announcement' : 'Create Announcement'}
                        </button>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {announcements.length === 0 ? (
                    <div className="bg-brand-container border border-brand-border rounded-2xl p-8 text-center text-gray-400">
                        <p>No announcements yet. Create one to get started!</p>
                    </div>
                ) : (
                    announcements.map(announcement => (
                        <div
                            key={announcement.id}
                            className={`bg-brand-container border-l-4 ${typeColors[announcement.type].border} rounded-lg p-6 ${typeColors[announcement.type].bg}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-white text-lg">{announcement.subject}</h3>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                            announcement.status === 'published' ? 'bg-green-500/20 text-green-400' :
                                            announcement.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                                            'bg-orange-500/20 text-orange-400'
                                        }`}>
                                            {announcement.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-300 mt-2">{announcement.message}</p>
                                    <p className="text-xs text-gray-500 mt-3">{new Date(announcement.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <button
                                        onClick={() => handleEdit(announcement)}
                                        className="px-3 py-1 rounded-lg bg-brand-accent/20 text-brand-accent hover:bg-brand-accent/30 transition text-sm font-medium"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(announcement.id)}
                                        className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-sm font-medium"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AnnouncementsPage;
