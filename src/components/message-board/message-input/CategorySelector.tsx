import { Tag } from 'lucide-react';
import React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageCategory } from '@/types/reactions';

interface CategorySelectorProps {
  value: MessageCategory;
  onChange: (value: MessageCategory) => void;
  adminOnly?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onChange,
  adminOnly = false,
}) => {
  const categories: MessageCategory[] = adminOnly ? ['General', 'Announcement'] : ['General'];

  return (
    <div className="flex items-center gap-1">
      <Tag className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={(value) => onChange(value as MessageCategory)}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat} className="text-xs">
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CategorySelector;
