import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../lib/api';

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  message: string;
  reply?: string;
  created_at: string;
  updated_at?: string;
  user_id?: string;
  priority?: 'low' | 'medium' | 'high';
}

const statusColors: { [key: string]: string } = {
  'open': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-yellow-500/20 text-yellow-400',
  'resolved': 'bg-green-500/20 text-green-400',
  'closed': 'bg-gray-500/20 text-gray-400',
};

const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Load user's support tickets from database
  useEffect(() => {
    const loadTickets = async () => {
      try {
        const allTickets = await adminAPI.getAllSupportTickets();
        setTickets(allTickets || []);
      } catch (error) {
        console.error('Failed to load support tickets:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTickets();
  }, []);

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      alert('Please fill in both subject and message');
      return;
    }

    try {
      // Save ticket to database via Supabase
      const { supabase } = await import('../../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('You must be logged in to create a ticket');
        return;
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: newSubject,
          message: newMessage,
          status: 'open',
          priority: 'medium',
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      if (data) {
        setTickets([data, ...tickets]);
      }
      
      setNewSubject('');
      setNewMessage('');
      setShowNewTicket(false);
      alert('Support ticket created successfully!');
    } catch (error) {
      console.error('Failed to create support ticket:', error);
      alert('Failed to create support ticket. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  if (selectedTicket) {
    return (
      <div>
        <button 
          onClick={() => setSelectedTicket(null)}
          className="mb-4 text-brand-light-purple hover:text-white flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
          Back to tickets
        </button>
        
        <div className="bg-brand-container border border-brand-border rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-2">Ticket #{selectedTicket.id.substring(0, 8)}</h2>
          <p className="text-gray-400 mb-4">{selectedTicket.subject}</p>
          <div className="mb-4">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedTicket.status]}`}>
              {selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}
            </span>
          </div>
          
          <div className="border border-brand-border rounded-lg p-4 mb-4 bg-black/20">
            <p className="text-sm">{selectedTicket.message}</p>
          </div>

          <textarea
            placeholder="Add a reply..."
            className="w-full bg-black/20 border border-brand-border rounded-lg p-3 focus:ring-2 focus:ring-brand-purple focus:outline-none mb-4"
            rows={4}
          />

          <button className="bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold px-4 py-2 rounded-lg">
            Send Reply
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div className="flex justify-end items-center mb-6">
             <button 
              onClick={() => setShowNewTicket(!showNewTicket)}
              className="bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                <span>New Ticket</span>
            </button>
        </div>

        {tickets.length === 0 && !showNewTicket ? (
            <p className="text-gray-400 text-center py-8">No support tickets yet. Create one to get help!</p>
        ) : (
            <div className="space-y-3 mb-6">
                {tickets.map(ticket => (
                    <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full text-left p-4 rounded-lg border transition ${
                            selectedTicket?.id === ticket.id
                                ? 'bg-brand-accent/20 border-brand-accent'
                                : 'bg-black/20 border-brand-border hover:bg-white/5'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="font-semibold text-white">{ticket.subject}</h3>
                                <p className="text-xs text-gray-400 mt-1">{new Date(ticket.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[ticket.status]}`}>
                                {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        )}

        {showNewTicket && (
          <div className="bg-brand-container border border-brand-border rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-bold mb-4">Create New Support Ticket</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  rows={5}
                  className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTicket}
                  className="flex-1 bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Create Ticket
                </button>
                <button
                  onClick={() => setShowNewTicket(false)}
                  className="flex-1 bg-black/20 border border-brand-border hover:bg-black/40 transition-colors text-white font-semibold px-4 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
      <div className="bg-brand-container border border-brand-border rounded-2xl">
        <div className="overflow-x-auto ds-scrollbar">
        <table className="w-full text-sm text-left">
                <thead className="bg-black/20">
                    <tr>
                        <th className="p-4 font-semibold">Ticket ID</th>
                        <th className="p-4 font-semibold">Subject</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold">Last Update</th>
                        <th className="p-4 font-semibold">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                    {tickets.map(ticket => (
                        <tr key={ticket.id} className="hover:bg-black/10">
                            <td className="p-4">#{ticket.id}</td>
                            <td className="p-4">{ticket.subject}</td>
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                                    {ticket.status}
                                </span>
                            </td>
                            <td className="p-4 text-gray-300">{ticket.lastUpdate}</td>
                            <td className="p-4">
                                <button 
                                  onClick={() => setSelectedTicket(ticket)}
                                  className="font-medium text-brand-light-purple hover:text-white">
                                  View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
