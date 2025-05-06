
import React from "react";
import { Tag } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageCategory, MESSAGE_CATEGORIES } from "@/types/reactions";

interface CategorySelectorProps {
  value: MessageCategory;
  onChange: (value: MessageCategory) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-1">
      <Tag className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={(value) => onChange(value as MessageCategory)}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          {MESSAGE_CATEGORIES.map((cat) => (
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
