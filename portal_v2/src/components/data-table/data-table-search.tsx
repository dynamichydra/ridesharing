import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface DataTableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DataTableSearch({
  value,
  onChange,
  placeholder = "Search...",
  className = ""
}: DataTableSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external value (e.g., when URL changes or resets)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSearch = () => {
    onChange(localValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`flex items-center gap-2 max-w-sm ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-8 h-9"
        />
      </div>
      <Button size="sm" onClick={handleSearch} className="h-9 px-4">
        Search
      </Button>
    </div>
  );
}
