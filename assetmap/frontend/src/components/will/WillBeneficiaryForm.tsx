import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface Props {
  onAdd: (beneficiary: any) => void;
}

export default function WillBeneficiaryForm({ onAdd }: Props) {
  const [form, setForm] = useState({
    name: '',
    relation: '',
    dob: '',
    mobile: '',
    email: '',
    address: '',
    pan: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(form);
    setForm({ name: '', relation: '', dob: '', mobile: '', email: '', address: '', pan: '' });
  };

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-lg">Add New Beneficiary</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="bg-black border-neutral-800" />
            </div>
            <div className="space-y-2">
              <Label>Relationship (e.g., Spouse, Son)</Label>
              <Input required value={form.relation} onChange={(e) => setForm({...form, relation: e.target.value})} className="bg-black border-neutral-800" />
            </div>
            <div className="space-y-2">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.dob} onChange={(e) => setForm({...form, dob: e.target.value})} className="bg-black border-neutral-800" />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input value={form.mobile} onChange={(e) => setForm({...form, mobile: e.target.value})} className="bg-black border-neutral-800" />
            </div>
          </div>
          
          <Button type="submit" variant="outline" className="border-amber-600 text-amber-500 hover:bg-amber-900/30">
            <Plus className="w-4 h-4 mr-2" /> Add Beneficiary
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
