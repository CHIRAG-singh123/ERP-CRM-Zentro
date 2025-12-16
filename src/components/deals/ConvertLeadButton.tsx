import { Handshake } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConvertLeadToDeal } from '../../hooks/queries/useLeads';
import { useToast } from '../../context/ToastContext';

interface ConvertLeadButtonProps {
  leadId: string;
  leadValue?: number;
}

export function ConvertLeadButton({ leadId, leadValue }: ConvertLeadButtonProps) {
  const [isConverting, setIsConverting] = useState(false);
  const convertLead = useConvertLeadToDeal();
  const navigate = useNavigate();
  const { success } = useToast();

  const handleConvert = async () => {
    if (!confirm('Are you sure you want to convert this lead to a deal?')) {
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertLead.mutateAsync({
        id: leadId,
        data: { value: leadValue },
      });
      success('Lead converted to deal successfully');
      if (result.deal && typeof result.deal === 'object' && '_id' in result.deal) {
        navigate(`/opportunities/${result.deal._id}`);
      }
    } catch (err) {
      // Error handled by mutation
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <button
      onClick={handleConvert}
      disabled={isConverting}
      className="flex items-center gap-2 rounded-md bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] hover:bg-[#BCE7E5] disabled:opacity-50"
    >
      <Handshake className="h-4 w-4" />
      {isConverting ? 'Converting...' : 'Convert to Deal'}
    </button>
  );
}

