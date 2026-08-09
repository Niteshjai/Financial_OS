import { useFamilyStore } from '../../store/familyStore';
import { formatCurrency } from '../../utils/formatters';

export default function FamilyMemberCard({ member }: { member: any }) {
  const { netWorth } = useFamilyStore();
  
  // Find member's net worth data
  const memberData = netWorth?.members?.find(m => m.userId === member.userId);
  const totalRupees = memberData ? memberData.totalPaise / 100 : 0;
  
  const statusColors = {
    active: 'text-emerald-600 bg-emerald-50',
    invited: 'text-amber-600 bg-amber-50',
    paused: 'text-gray-500 bg-gray-100',
    removed: 'text-red-600 bg-red-50'
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.03)] border border-black/[0.03] p-5 hover:border-black/10 transition-colors cursor-pointer group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="size-10 rounded-full flex items-center justify-center text-white font-medium"
            style={{ backgroundColor: member.avatarColor || '#185FA5' }}
          >
            {member.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {member.displayName}
            </h4>
            <p className="text-xs text-gray-500 capitalize">{member.relationship}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[member.status as keyof typeof statusColors] || statusColors.active}`}>
          {member.status}
        </div>
      </div>
      
      <div>
        <p className="text-xs text-gray-500 mb-1">Shared Wealth</p>
        <p className="text-lg font-semibold text-gray-900">
          {member.status === 'active' ? formatCurrency(totalRupees) : '—'}
        </p>
      </div>
    </div>
  );
}

