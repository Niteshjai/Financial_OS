import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, UserPlus, Scale, Check, Plus, Loader2 } from 'lucide-react';
import WillBeneficiaryForm from './WillBeneficiaryForm';
import WillPreview from './WillPreview';

export default function WillBuilder() {
  const [activeTab, setActiveTab] = useState('testator');
  const [loading, setLoading] = useState(false);
  const [willId, setWillId] = useState<string | null>(null);

  const [testator, setTestator] = useState({
    testatorName: '',
    testatorDob: '',
    testatorAddress: '',
    testatorPan: '',
    testatorAadhaarHash: '',
    executorName: '',
    executorRelation: '',
    executorMobile: ''
  });

  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);

  const handleCreateDraft = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/will/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          ...testator,
          subscriptionPlan: 'basic',
          subscriptionId: 'mock_sub_123'
        })
      });
      const data = await response.json();
      if (data.success) {
        setWillId(data.data.willId);
        setActiveTab('beneficiaries');
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddBeneficiary = async (beneficiary: any) => {
    if (!willId) return;
    try {
      const response = await fetch(`/api/will/${willId}/beneficiary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(beneficiary)
      });
      const data = await response.json();
      if (data.success) {
        setBeneficiaries([...beneficiaries, { ...beneficiary, id: data.data.beneficiaryId }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAllocation = async (allocation: any) => {
    if (!willId) return;
    try {
      const response = await fetch(`/api/will/${willId}/allocation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(allocation)
      });
      const data = await response.json();
      if (data.success) {
        setAllocations([...allocations, { ...allocation, id: data.data.allocationId }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generatePDF = async () => {
    if (!willId) return;
    setLoading(true);
    try {
      await fetch(`/api/will/${willId}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      // In a real flow, trigger download or move to esign
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center gap-3">
        <Scale className="h-10 w-10 text-amber-500" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Digital Will Builder</h1>
          <p className="text-muted-foreground">Secure your family's future with a legally recognized asset allocation document.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-neutral-900">
          <TabsTrigger value="testator" disabled={!!willId && activeTab !== 'testator'}>
            <FileText className="w-4 h-4 mr-2" /> Details
          </TabsTrigger>
          <TabsTrigger value="beneficiaries" disabled={!willId}>
            <UserPlus className="w-4 h-4 mr-2" /> Beneficiaries
          </TabsTrigger>
          <TabsTrigger value="assets" disabled={!willId}>
            <Scale className="w-4 h-4 mr-2" /> Assets
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={!willId}>
            <Check className="w-4 h-4 mr-2" /> Review & Sign
          </TabsTrigger>
        </TabsList>

        <TabsContent value="testator" className="mt-6">
          <Card className="bg-black border-neutral-800">
            <CardHeader>
              <CardTitle>Your Details (Testator) & Executor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b border-neutral-800 pb-2">Testator (You)</h3>
                  <div className="space-y-2">
                    <Label>Full Legal Name</Label>
                    <Input value={testator.testatorName} onChange={(e) => setTestator({...testator, testatorName: e.target.value})} className="bg-neutral-900 border-neutral-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={testator.testatorDob} onChange={(e) => setTestator({...testator, testatorDob: e.target.value})} className="bg-neutral-900 border-neutral-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>PAN</Label>
                    <Input value={testator.testatorPan} onChange={(e) => setTestator({...testator, testatorPan: e.target.value})} className="bg-neutral-900 border-neutral-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>Full Address</Label>
                    <Input value={testator.testatorAddress} onChange={(e) => setTestator({...testator, testatorAddress: e.target.value})} className="bg-neutral-900 border-neutral-800" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b border-neutral-800 pb-2">Executor</h3>
                  <p className="text-xs text-neutral-400">The person who will execute your will after your passing.</p>
                  <div className="space-y-2">
                    <Label>Executor Name</Label>
                    <Input value={testator.executorName} onChange={(e) => setTestator({...testator, executorName: e.target.value})} className="bg-neutral-900 border-neutral-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Input value={testator.executorRelation} onChange={(e) => setTestator({...testator, executorRelation: e.target.value})} className="bg-neutral-900 border-neutral-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <Input value={testator.executorMobile} onChange={(e) => setTestator({...testator, executorMobile: e.target.value})} className="bg-neutral-900 border-neutral-800" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleCreateDraft} disabled={loading || !testator.testatorName} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save & Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beneficiaries" className="mt-6">
          <div className="space-y-6">
            <WillBeneficiaryForm onAdd={handleAddBeneficiary} />
            
            {beneficiaries.length > 0 && (
              <Card className="bg-black border-neutral-800">
                <CardHeader>
                  <CardTitle>Added Beneficiaries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {beneficiaries.map((b, i) => (
                      <div key={i} className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{b.name}</p>
                          <p className="text-sm text-neutral-400">{b.relation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button onClick={() => setActiveTab('assets')} className="bg-amber-600 hover:bg-amber-700 text-white">
                      Continue to Assets
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
           <Card className="bg-black border-neutral-800">
            <CardHeader>
              <CardTitle>Allocate Assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <p className="text-neutral-400">Map your existing assets to your beneficiaries.</p>
               {/* Simplified Asset Allocation Form for UI purposes */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset Description</Label>
                    <Input id="asset-desc" placeholder="e.g. HDFC Bank Account" className="bg-neutral-900 border-neutral-800" />
                  </div>
                  <div className="space-y-2">
                    <Label>Select Beneficiary</Label>
                    <select id="asset-ben" className="w-full p-2 bg-neutral-900 border border-neutral-800 rounded-md text-white h-10">
                      {beneficiaries.map((b, i) => <option key={i} value={b.name}>{b.name} ({b.relation})</option>)}
                    </select>
                  </div>
               </div>
               <Button variant="outline" className="border-amber-600 text-amber-500 hover:bg-amber-900/30" onClick={() => {
                  const desc = (document.getElementById('asset-desc') as HTMLInputElement)?.value;
                  const benName = (document.getElementById('asset-ben') as HTMLSelectElement)?.value;
                  if (desc && benName) {
                    handleAddAllocation({
                      assetType: 'bank_account',
                      assetDescription: desc,
                      estimatedValuePaise: 0,
                      beneficiaryId: beneficiaries.find(b => b.name === benName)?.id || '',
                      beneficiaryName: benName,
                      beneficiaryRelation: beneficiaries.find(b => b.name === benName)?.relation || '',
                      allocationPct: 100
                    });
                  }
               }}>
                 <Plus className="w-4 h-4 mr-2" /> Add Allocation
               </Button>

               {allocations.length > 0 && (
                 <div className="space-y-3 mt-6">
                   <h3 className="font-semibold text-white">Current Allocations</h3>
                   {allocations.map((a, i) => (
                     <div key={i} className="flex justify-between items-center p-3 bg-neutral-900/50 border border-neutral-800 rounded-lg text-sm">
                       <span className="font-medium text-white">{a.assetDescription}</span>
                       <span className="text-neutral-400">→</span>
                       <span className="font-medium text-amber-400">{a.beneficiaryName} (100%)</span>
                     </div>
                   ))}
                   
                   <div className="pt-4 flex justify-end border-t border-neutral-800">
                      <Button onClick={() => setActiveTab('preview')} className="bg-amber-600 hover:bg-amber-700 text-white">
                        Review & Generate
                      </Button>
                   </div>
                 </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
           <WillPreview 
             testator={testator} 
             allocations={allocations} 
             onGenerate={generatePDF} 
             loading={loading} 
           />
        </TabsContent>

      </Tabs>
    </div>
  );
}
