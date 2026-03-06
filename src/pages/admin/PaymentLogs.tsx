import React from 'react';

const payments = [
    { id: 'txn_1', user: 'john.doe', amount: 10.00, method: 'Credit Card', date: '2024-07-28', status: 'Completed' },
    { id: 'txn_2', user: 'jane.smith', amount: 25.00, method: 'PayPal', date: '2024-07-27', status: 'Completed' },
    { id: 'txn_3', user: 'testuser', amount: 5.00, method: 'EasyPaisa', date: '2024-07-26', status: 'Failed' },
];

const statusColors: { [key: string]: string } = {
  Completed: 'bg-green-500/20 text-green-400',
  Failed: 'bg-red-500/20 text-red-400',
};

const PaymentLogsPage: React.FC = () => {
    return (
        <div>
            <div className="bg-brand-container border border-brand-border rounded-2xl">
                <div className="overflow-x-auto ds-scrollbar">
                <table className="w-full text-sm text-left">
                    <thead className="bg-black/20">
                        <tr>
                            <th className="p-4 font-semibold">Transaction ID</th>
                            <th className="p-4 font-semibold">User</th>
                            <th className="p-4 font-semibold">Amount</th>
                            <th className="p-4 font-semibold">Method</th>
                            <th className="p-4 font-semibold">Date</th>
                            <th className="p-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                        {payments.map(p => (
                            <tr key={p.id} className="hover:bg-black/10">
                                <td className="p-4 font-mono text-xs">{p.id}</td>
                                <td className="p-4">{p.user}</td>
                                <td className="p-4 font-medium text-green-400">${p.amount.toFixed(2)}</td>
                                <td className="p-4 text-gray-300">{p.method}</td>
                                <td className="p-4 text-gray-300">{p.date}</td>
                                <td className="p-4">
                                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.status]}`}>
                                        {p.status}
                                    </span>
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

export default PaymentLogsPage;
