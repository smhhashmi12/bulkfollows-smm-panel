import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';

interface SupportTicket {
    id: string;
    user_id?: string;
    subject: string;
    message: string;
    status: 'open' | 'in-progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    reply?: string;
    created_at: string;
    updated_at?: string;
    user?: {
        username: string;
        email: string;
    };
}

const statusColors: { [key: string]: string } = {
    open: 'bg-blue-500/20 text-blue-400',
    'in-progress': 'bg-yellow-500/20 text-yellow-400',
    resolved: 'bg-green-500/20 text-green-400',
    closed: 'bg-gray-500/20 text-gray-400',
};

const priorityColors: { [key: string]: string } = {
    low: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    high: 'bg-red-500/20 text-red-400',
};

const SupportTicketsPage: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [reply, setReply] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterPriority, setFilterPriority] = useState<string>('');
    const [loading, setLoading] = useState(true);

    // Load tickets from database
    useEffect(() => {
        const loadTickets = async () => {
            try {
                const data = await adminAPI.getAllSupportTickets();
                setTickets(data || []);
            } catch (error) {
                console.error('Failed to load support tickets:', error);
            } finally {
                setLoading(false);
            }
        };
        loadTickets();
    }, []);

    const filteredTickets = tickets.filter(ticket => {
        return (!filterStatus || ticket.status === filterStatus) &&
               (!filterPriority || ticket.priority === filterPriority);
    });

    const handleReply = async () => {
        if (selectedTicket && reply.trim()) {
            try {
                await adminAPI.createSupportTicketReply(selectedTicket.id, reply);
                
                // Update local state
                const updatedTicket = { ...selectedTicket, reply, status: 'resolved' as const };
                setSelectedTicket(updatedTicket);
                setTickets(prev => prev.map(t => 
                    t.id === selectedTicket.id ? updatedTicket : t
                ));
                setReply('');
            } catch (error) {
                console.error('Failed to send reply:', error);
            }
        }
    };

    const handleStatusChange = async (ticketId: string, newStatus: string) => {
        try {
            const updatedData = await adminAPI.updateSupportTicket(ticketId, {
                status: newStatus,
                updated_at: new Date().toISOString(),
            });
            
            const updatedTicket = {
                ...updatedData,
                status: newStatus as any,
            };
            
            setTickets(prev => prev.map(t => 
                t.id === ticketId ? updatedTicket : t
            ));
            if (selectedTicket?.id === ticketId) {
                setSelectedTicket(updatedTicket);
            }
        } catch (error) {
            console.error('Failed to update ticket status:', error);
        }
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="bg-brand-container border border-brand-border rounded-2xl p-6 mb-6">
                        <div className="flex flex-wrap gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Status</label>
                                <select 
                                    value={filterStatus} 
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="bg-black/20 border border-brand-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                >
                                    <option value="">All Status</option>
                                    <option value="open">Open</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Priority</label>
                                <select 
                                    value={filterPriority} 
                                    onChange={(e) => setFilterPriority(e.target.value)}
                                    className="bg-black/20 border border-brand-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
                                >
                                    <option value="">All Priority</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        {filteredTickets.length === 0 ? (
                            <p className="text-gray-400 text-center py-8">No support tickets found.</p>
                        ) : (
                            <div className="space-y-2">
                                {filteredTickets.map(ticket => (
                                    <button
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={`w-full text-left p-4 rounded-lg border transition ${
                                            selectedTicket?.id === ticket.id
                                                ? 'bg-brand-accent/20 border-brand-accent'
                                                : 'bg-black/20 border-brand-border hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-white">{ticket.subject}</h3>
                                                <p className="text-sm text-gray-400 mt-1">{ticket.user?.username || 'Unknown'} • {ticket.user?.email || 'N/A'}</p>
                                                <p className="text-sm text-gray-400 mt-1">{new Date(ticket.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                                                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
                                                </span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}>
                                                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    {selectedTicket ? (
                        <div className="bg-brand-container border border-brand-border rounded-2xl p-6">
                            <h2 className="text-lg font-bold mb-4">Ticket Details</h2>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="text-sm text-gray-400">Subject</p>
                                    <p className="font-semibold">{selectedTicket.subject}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">From</p>
                                    <p className="font-semibold">{selectedTicket.user?.username || 'Unknown'}</p>
                                    <p className="text-sm text-gray-400">{selectedTicket.user?.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Priority</p>
                                    <select 
                                        value={selectedTicket.priority}
                                        onChange={(e) => {
                                            const updatedTicket = { ...selectedTicket, priority: e.target.value as any };
                                            setTickets(prev => prev.map(t => 
                                                t.id === selectedTicket.id ? updatedTicket : t
                                            ));
                                            setSelectedTicket(updatedTicket);
                                        }}
                                        className="mt-2 bg-black/20 border border-brand-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none w-full"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Status</p>
                                    <select 
                                        value={selectedTicket.status}
                                        onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                                        className="mt-2 bg-black/20 border border-brand-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none w-full"
                                    >
                                        <option value="open">Open</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="border-t border-brand-border pt-6">
                                <p className="text-sm font-semibold text-gray-300 mb-2">Message</p>
                                <p className="text-sm text-gray-400 bg-black/20 p-3 rounded-lg mb-4">{selectedTicket.message}</p>

                                {selectedTicket.reply && (
                                    <div className="mb-4">
                                        <p className="text-sm font-semibold text-gray-300 mb-2">Admin Reply</p>
                                        <p className="text-sm text-gray-400 bg-black/20 p-3 rounded-lg">{selectedTicket.reply}</p>
                                    </div>
                                )}

                                {selectedTicket.status !== 'closed' && !selectedTicket.reply && (
                                    <div>
                                        <textarea
                                            value={reply}
                                            onChange={(e) => setReply(e.target.value)}
                                            placeholder="Type your reply..."
                                            className="w-full bg-black/20 border border-brand-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none mb-3"
                                            rows={3}
                                        />
                                        <button 
                                            onClick={handleReply}
                                            className="w-full bg-brand-accent text-white font-semibold p-2 rounded-lg hover:opacity-90 transition disabled:opacity-50"
                                            disabled={!reply.trim()}
                                        >
                                            Send Reply
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-brand-container border border-brand-border rounded-2xl p-6 text-center text-gray-400">
                            <p>Select a ticket to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportTicketsPage;

