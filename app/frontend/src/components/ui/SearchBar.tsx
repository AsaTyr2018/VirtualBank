import { Icon } from './Icon';

interface SearchBarProps {
  placeholder?: string;
}

export const SearchBar = ({ placeholder }: SearchBarProps) => {
  return (
    <label className="search-bar">
      <Icon name="sparkles" />
      <input type="search" placeholder={placeholder ?? 'Search'} />
    </label>
  );
};
