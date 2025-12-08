import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HeroCardTargetType } from "@/types/heroCard";

interface TargetSelectorProps {
  targetType: HeroCardTargetType;
  value: string;
  onChange: (value: string) => void;
}

const TargetSelector: React.FC<TargetSelectorProps> = ({ targetType, value, onChange }) => {
  const { data: teams } = useQuery({
    queryKey: ['teams-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: targetType === 'team'
  });

  const { data: divisions } = useQuery({
    queryKey: ['divisions-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: targetType === 'division'
  });

  const { data: seasons } = useQuery({
    queryKey: ['seasons-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seasons')
        .select('id, name')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: targetType === 'season'
  });

  const getOptions = () => {
    switch (targetType) {
      case 'team':
        return teams || [];
      case 'division':
        return divisions || [];
      case 'season':
        return seasons || [];
      default:
        return [];
    }
  };

  const options = getOptions();
  const label = targetType.charAt(0).toUpperCase() + targetType.slice(1);

  return (
    <div className="space-y-2">
      <Label htmlFor="target_id">Select {label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TargetSelector;
