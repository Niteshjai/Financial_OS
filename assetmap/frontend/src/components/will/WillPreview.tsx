
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, Info } from 'lucide-react';

interface Props {
  testator: any;
  allocations: any[];
  onGenerate: () => void;
  loading: boolean;
}

export default function WillPreview({ testator, allocations, onGenerate, loading }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-amber-950/30 border border-amber-900/50 p-4 rounded-lg flex gap-3 text-amber-200 text-sm">
        <Info className="h-5 w-5 flex-shrink-0 text-amber-500" />
        <p>
          Please review the details below. Once generated, this document serves as a digital record of your wishes.
          To make it a legally binding will under the Indian Succession Act, you will need to sign it in the presence of two witnesses.
        </p>
      </div>

      <Card className="bg-white text-black p-4 md:p-8 rounded-none max-w-3xl mx-auto shadow-2xl">
        <div className="text-center mb-8 border-b-2 border-neutral-200 pb-4">
          <h1 className="text-3xl font-serif font-bold uppercase tracking-wider">Last Will and Testament</h1>
          <p className="mt-2 font-serif text-lg">of {testator.testatorName || '[Your Name]'}</p>
        </div>

        <div className="space-y-6 font-serif leading-relaxed">
          <section>
            <p>
              I, <strong>{testator.testatorName || '[Name]'}</strong>, currently residing at {testator.testatorAddress || '[Address]'}, 
              bearing PAN {testator.testatorPan || '[PAN]'}, being of sound mind and memory, do hereby make, publish, and declare this 
              to be my Last Will and Testament, revoking all prior wills and codicils.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">1. Appointment of Executor</h2>
            <p>
              I hereby appoint <strong>{testator.executorName || '[Executor Name]'}</strong> (Relation: {testator.executorRelation || '[Relation]'}) 
              as the Executor of this Will.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Bequests and Asset Allocation</h2>
            <p className="mb-4">I direct that my assets be distributed as follows:</p>
            
            {allocations.length === 0 ? (
              <p className="text-neutral-500 italic">[No allocations added yet]</p>
            ) : (
              <ul className="list-disc pl-6 space-y-2">
                {allocations.map((a, i) => (
                  <li key={i}>
                    My interest in the asset described as <strong>{a.assetDescription}</strong> shall be given 
                    to <strong>{a.beneficiaryName}</strong> ({a.percentage}% share).
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="pt-8">
            <h2 className="text-xl font-bold mb-2">3. Declaration and Signatures</h2>
            <p className="mb-12">
              IN WITNESS WHEREOF, I have hereunto set my hand to this Will on this date _____________________.
            </p>
            
            <div className="flex justify-between mt-8 pt-8 border-t border-dashed border-neutral-300">
              <div className="text-center">
                <div className="w-48 border-b border-black mb-2"></div>
                <p className="font-bold">{testator.testatorName || 'Testator Name'}</p>
                <p className="text-sm text-neutral-600">Testator</p>
              </div>
            </div>

            <p className="mt-8 mb-12">
              Signed and declared by the above-named testator as their Last Will and Testament, in the presence of us, who in their presence, and at their request, and in the presence of each other, have hereunto subscribed our names as witnesses.
            </p>

            <div className="flex justify-between gap-8 mt-8">
              <div className="flex-1 text-center">
                <div className="w-full border-b border-black mb-2"></div>
                <p className="text-sm text-neutral-600">Witness 1 Signature</p>
              </div>
              <div className="flex-1 text-center">
                <div className="w-full border-b border-black mb-2"></div>
                <p className="text-sm text-neutral-600">Witness 2 Signature</p>
              </div>
            </div>
          </section>
        </div>
      </Card>

      <div className="flex justify-center pt-6">
        <Button size="lg" className="bg-zinc-900 dark:bg-lime-400 text-white dark:text-zinc-900 font-semibold hover:bg-zinc-800 dark:hover:bg-lime-500 shadow-lg shadow-zinc-900/10 dark:shadow-lime-400/10" onClick={onGenerate} disabled={loading}>
          {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileDown className="w-5 h-5 mr-2" />}
          Generate Formal PDF
        </Button>
      </div>
    </div>
  );
}
