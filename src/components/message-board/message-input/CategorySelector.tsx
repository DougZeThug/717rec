
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCategory, MESSAGE_CATEGORIES } from "@/types/reactions";

interface CategorySelectorProps {
  value: MessageCategory;
  onChange: (value: MessageCategory) => void;
  adminOnly?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, adminOnly = false }) => {
  const categories = adminOnly ? MESSAGE_CATEGORIES : MESSAGE_CATEGORIES.filter(cat => cat !== 'Announcement');

  return (
    <Select value={value} onValueChange={val => onChange(val as MessageCategory)}>
      <SelectTrigger className="w-[140px] h-8 text-xs">
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        {categories.map(category => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CategorySelector;
