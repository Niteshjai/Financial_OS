import React, { useState } from 'react';
import { api } from '../../services/api';

export function WillBuilder() {
  const [formData, setFormData] = useState({
    testatorName: '',
    testatorDob: '',
    testatorAddress: '',
    testatorPan: '',
    testatorAadhaarHash: '',
    executorName: '',
    executorRelation: '',
    executorMobile: '',
    subscriptionPlan: 'premium',
    subscriptionId: 'sub_123'
  });
  const [willId, setWillId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/will/create', formData);
      setWillId(res.data.willId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      await api.post(`/will/${willId}/generate-pdf`, {});
      alert("PDF Generated Successfully!");
    } catch (error) {
      console.error(error);
    }
  };

  if (willId) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/50">
        <h2 className="text-xl font-semibold mb-4 text-green-600">Will Draft Created Successfully</h2>
        <p className="mb-4">Your will ID is: <span className="font-mono">{willId}</span></p>
        <div className="flex gap-4">
          <button onClick={handleGeneratePdf} className="bg-black text-white px-4 py-2 rounded-xl">Generate PDF</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200/50">
      <h2 className="text-xl font-semibold mb-6">Create Digital Will</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-lg">
        <input required type="text" placeholder="Your Full Name" className="border p-2 rounded-xl" onChange={e => setFormData({...formData, testatorName: e.target.value})} />
        <input required type="date" placeholder="Date of Birth" className="border p-2 rounded-xl" onChange={e => setFormData({...formData, testatorDob: e.target.value})} />
        <input required type="text" placeholder="Full Address" className="border p-2 rounded-xl" onChange={e => setFormData({...formData, testatorAddress: e.target.value})} />
        <input required type="text" placeholder="Executor Full Name" className="border p-2 rounded-xl" onChange={e => setFormData({...formData, executorName: e.target.value})} />
        <input required type="text" placeholder="Executor Relation (e.g. Spouse)" className="border p-2 rounded-xl" onChange={e => setFormData({...formData, executorRelation: e.target.value})} />
        <input required type="text" placeholder="Executor Mobile" className="border p-2 rounded-xl" onChange={e => setFormData({...formData, executorMobile: e.target.value})} />
        
        <button type="submit" className="bg-black text-white py-2 rounded-xl font-medium mt-4">Save Will Details</button>
      </form>
    </div>
  );
}
