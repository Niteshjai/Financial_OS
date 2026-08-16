import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, UserPlus, Scale, Check, Plus, Loader2 } from 'lucide-react';
import WillBeneficiaryForm from './WillBeneficiaryForm';
import WillPreview from './WillPreview';
import { api } from '@/services/api';
import { useAssetStore } from '@/store/assetStore';
import { toast } from 'sonner';

export default function WillBuilder() {
  const { assets, landRecords } = useAssetStore();
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

  // Asset selection state
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState('');
  const [allocationPct, setAllocationPct] = useState('100');

  const allAssets = [
    ...assets.map(a => ({ id: a.id, name: `${a.institutionName} - ${a.accountRef || 'A/c'} (${a.fiType})`, type: 'financial' })),
    ...landRecords.map(l => ({ id: l.id, name: `Property at ${l.district}, ${l.state}`, type: 'property' }))
  ];

  const handleCreateDraft = async () => {
    if (!testator.testatorName || !testator.testatorDob || !testator.testatorAadhaarHash || !testator.executorName || !testator.executorRelation || !testator.executorMobile) {
      toast.error('Please fill in all required fields, including Executor details.');
      return;
    }
    
    setLoading(true);
    try {
      const cleanAadhaar = testator.testatorAadhaarHash.replace(/\s/g, '');
      const response = await api.post('/will/create', {
        ...testator,
        testatorAadhaarHash: cleanAadhaar,
        subscriptionPlan: 'basic',
        subscriptionId: 'mock_sub_123'
      });
      
      const data = response.data;
      if (data?.success) {
        setWillId(data.data.willId);
        setActiveTab('beneficiaries');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error?.message || 'Failed to save will details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBeneficiary = async (beneficiary: any) => {
    if (!willId) return;
    try {
      const response = await api.post(`/will/${willId}/beneficiary`, beneficiary);
      const data = response.data;
      if (data?.success) {
        setBeneficiaries([...beneficiaries, { ...beneficiary, id: data.data.beneficiaryId }]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAllocation = async () => {
    if (!willId || !selectedAssetId || !selectedBeneficiaryId) return;
    try {
      const percentage = parseFloat(allocationPct);
      if (isNaN(percentage) || percentage <= 0 || percentage > 100) return;

      const asset = allAssets.find(a => a.id === selectedAssetId);
      const beneficiary = beneficiaries.find(b => b.id === selectedBeneficiaryId);

      const response = await api.post(`/will/${willId}/allocation`, {
        assetType: asset?.type || 'other',
        assetRefId: selectedAssetId,
        assetDescription: asset?.name || 'Unknown Asset',
        estimatedValuePaise: 0,
        beneficiaryId: selectedBeneficiaryId,
        beneficiaryName: beneficiary?.name || '',
        beneficiaryRelation: beneficiary?.relation || beneficiary?.relationship || '',
        allocationPct: percentage
      });
      
      const data = response.data;
      if (data?.success) {
        const asset = allAssets.find(a => a.id === selectedAssetId);
        const beneficiary = beneficiaries.find(b => b.id === selectedBeneficiaryId);
        
        setAllocations([...allocations, { 
          id: data.data.allocationId,
          assetId: selectedAssetId,
          beneficiaryId: selectedBeneficiaryId,
          percentage,
          assetDescription: asset?.name,
          beneficiaryName: beneficiary?.name
        }]);
        
        setSelectedAssetId('');
        setSelectedBeneficiaryId('');
        setAllocationPct('100');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generatePDF = async () => {
    if (!willId) return;
    setLoading(true);
    try {
      await api.post(`/will/${willId}/generate-pdf`, {});
      // In a real flow, trigger download or move to esign
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="h-10 w-10 text-lime-500 dark:text-lime-400" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Digital Will Builder</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Secure your family's future with a legally recognized asset allocation document.</p>
        </div>
      </div>

      <Card className="bg-white dark:bg-[#1A1D27] border-zinc-200 dark:border-zinc-800 shadow-sm mt-8 overflow-hidden max-w-5xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          
          <div className="p-4 md:p-6 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-black/20">
            <TabsList className="grid w-full grid-cols-4 bg-zinc-100 dark:bg-zinc-900/50 p-1">
              <TabsTrigger value="testator" disabled={!!willId && activeTab !== 'testator'} className="data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-800 data-[state=active]:text-zinc-900 data-[state=active]:dark:text-white">
                <FileText className="w-4 h-4 mr-2" /> Details
              </TabsTrigger>
              <TabsTrigger value="beneficiaries" disabled={!willId} className="data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-800 data-[state=active]:text-zinc-900 data-[state=active]:dark:text-white">
                <UserPlus className="w-4 h-4 mr-2" /> Beneficiaries
              </TabsTrigger>
              <TabsTrigger value="assets" disabled={!willId} className="data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-800 data-[state=active]:text-zinc-900 data-[state=active]:dark:text-white">
                <Scale className="w-4 h-4 mr-2" /> Assets
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={!willId} className="data-[state=active]:bg-white data-[state=active]:dark:bg-zinc-800 data-[state=active]:text-zinc-900 data-[state=active]:dark:text-white">
                <Check className="w-4 h-4 mr-2" /> Review & Sign
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-6 md:p-8">
            <TabsContent value="testator" className="m-0 focus-visible:outline-none space-y-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-6">
                Step 1: Your Details & Executor
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b border-zinc-200 dark:border-zinc-800 pb-2 text-zinc-900 dark:text-white">Testator (You)</h3>
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Full Legal Name *</Label>
                    <Input required value={testator.testatorName} onChange={(e) => setTestator({...testator, testatorName: e.target.value})} className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Date of Birth *</Label>
                    <Input required type="date" value={testator.testatorDob} onChange={(e) => setTestator({...testator, testatorDob: e.target.value})} className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Aadhaar Number *</Label>
                    <Input required value={testator.testatorAadhaarHash} onChange={(e) => setTestator({...testator, testatorAadhaarHash: e.target.value})} maxLength={14} placeholder="XXXX XXXX XXXX" className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">PAN (Optional)</Label>
                    <Input value={testator.testatorPan} onChange={(e) => setTestator({...testator, testatorPan: e.target.value})} className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Full Address</Label>
                    <Input value={testator.testatorAddress} onChange={(e) => setTestator({...testator, testatorAddress: e.target.value})} className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b border-zinc-200 dark:border-zinc-800 pb-2 text-zinc-900 dark:text-white">Executor</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">The person who will execute your will after your passing.</p>
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Executor Name</Label>
                    <Input value={testator.executorName} onChange={(e) => setTestator({...testator, executorName: e.target.value})} className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Relationship</Label>
                    <Input value={testator.executorRelation} onChange={(e) => setTestator({...testator, executorRelation: e.target.value})} className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-700 dark:text-zinc-300">Mobile Number</Label>
                    <Input value={testator.executorMobile} onChange={(e) => setTestator({...testator, executorMobile: e.target.value})} className="bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleCreateDraft} 
                  disabled={loading || !testator.testatorName || !testator.testatorDob || (testator.testatorAadhaarHash.replace(/\s/g, '').length < 12) || !testator.executorName || !testator.executorRelation || !testator.executorMobile} 
                  className="bg-zinc-900 dark:bg-lime-400 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-lime-500"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save & Continue
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="beneficiaries" className="m-0 focus-visible:outline-none space-y-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-6">
                Step 2: Add Beneficiaries
              </h2>
              <WillBeneficiaryForm onAdd={handleAddBeneficiary} />
              
              {beneficiaries.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">Added Beneficiaries</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {beneficiaries.map((b, i) => (
                      <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-white">{b.name}</p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">{b.relationship || b.relation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="mt-8 flex justify-end">
                <Button 
                  onClick={() => setActiveTab('assets')} 
                  disabled={beneficiaries.length === 0}
                  className="bg-zinc-900 dark:bg-lime-400 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-lime-500"
                >
                  Continue to Assets
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="assets" className="m-0 focus-visible:outline-none space-y-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-6">
                Step 3: Allocate Assets
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400">Map your existing synced assets to your beneficiaries.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-zinc-50 dark:bg-zinc-900/30 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="space-y-2 md:col-span-5">
                  <Label className="text-zinc-700 dark:text-zinc-300">Select Asset</Label>
                  <select 
                    value={selectedAssetId}
                    onChange={(e) => setSelectedAssetId(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-white h-10 text-sm"
                  >
                    <option value="">Select an asset...</option>
                    {allAssets.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-4">
                  <Label className="text-zinc-700 dark:text-zinc-300">Select Beneficiary</Label>
                  <select 
                    value={selectedBeneficiaryId}
                    onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-md text-zinc-900 dark:text-white h-10 text-sm"
                  >
                    <option value="">Select beneficiary...</option>
                    {beneficiaries.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.relationship})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label className="text-zinc-700 dark:text-zinc-300">Percentage (%)</Label>
                  <Input 
                    type="number" 
                    min="1" max="100" 
                    value={allocationPct}
                    onChange={(e) => setAllocationPct(e.target.value)}
                    className="bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white" 
                  />
                </div>
                <div className="md:col-span-12 pt-2">
                  <Button 
                    variant="outline" 
                    disabled={!selectedAssetId || !selectedBeneficiaryId || !allocationPct}
                    className="border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 w-full md:w-auto" 
                    onClick={handleAddAllocation}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Allocation
                  </Button>
                </div>
              </div>

              {allocations.length > 0 && (
                <div className="mt-8 space-y-4">
                  <h3 className="font-semibold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2">Current Allocations</h3>
                  <div className="space-y-2">
                    {allocations.map((a, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm">
                        <span className="font-medium text-zinc-900 dark:text-white">{a.assetDescription}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">→</span>
                        <span className="font-medium text-lime-600 dark:text-lime-400">{a.beneficiaryName} ({a.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                  
              <div className="pt-6 flex justify-end">
                <Button 
                  onClick={() => setActiveTab('preview')} 
                  className="bg-zinc-900 dark:bg-lime-400 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-lime-500"
                >
                  Review & Generate
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="m-0 focus-visible:outline-none">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2 mb-6">
                Step 4: Review & Generate
              </h2>
              <WillPreview 
                testator={testator} 
                allocations={allocations} 
                onGenerate={generatePDF} 
                loading={loading} 
              />
            </TabsContent>

          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
