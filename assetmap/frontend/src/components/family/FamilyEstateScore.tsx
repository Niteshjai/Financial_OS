import { useFamilyStore } from '../../store/familyStore';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function FamilyEstateScore() {
  const { estate } = useFamilyStore();

  if (!estate) return null;

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-black/[0.03] p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Family Estate Readiness</h3>
      
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="relative size-32 flex items-center justify-center mb-4">
          <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-100"
              strokeDasharray="100, 100"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <path
              className={estate.overallScore > 70 ? "text-emerald-500" : estate.overallScore > 40 ? "text-amber-500" : "text-red-500"}
              strokeDasharray={`${estate.overallScore}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
          </svg>
          <div className="flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{estate.overallScore}</span>
            <span className="text-xs text-gray-500">/100</span>
          </div>
        </div>
        <p className="text-sm font-medium text-gray-700 text-center">
          {estate.overallScore > 70 ? 'Your family is well protected' : 'Your family needs estate planning'}
        </p>
      </div>

      <div className="space-y-4">
        {estate.members.map((member: any) => (
          <div key={member.userId} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div 
                className="size-8 rounded-full flex items-center justify-center text-white text-xs font-medium group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: member.avatarColor || '#185FA5' }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">{member.name}</h4>
                <p className="text-xs text-gray-500">
                  {member.nomineePct}% accounts nominated
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className={`flex items-center gap-1 text-xs font-medium ${member.hasWill ? 'text-emerald-600' : 'text-red-500'}`}>
                {member.hasWill ? <ShieldCheck className="size-3" /> : <ShieldAlert className="size-3" />}
                {member.hasWill ? 'Will Created' : 'No Will'}
              </div>
              <div className="text-xs font-semibold text-gray-900">{member.estateScore}/100</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

