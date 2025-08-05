import React from 'react';
import Select from 'react-select';
import { DropdownOption } from '../types/mapping';

interface CascadingSelectProps {
  options: DropdownOption[];
  value: string | undefined;
  onChange: (value: string | null) => void;
  placeholder: string;
  isDisabled?: boolean;
  className?: string;
}

const CascadingSelect: React.FC<CascadingSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  isDisabled = false,
  className = ''
}) => {
  const selectedOption = options.find(option => option.value === value) || null;

  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: '32px',
      border: '1px solid hsl(var(--border))',
      borderRadius: '4px',
      backgroundColor: isDisabled ? 'hsl(var(--muted))' : 'hsl(var(--background))',
      boxShadow: 'none',
      width: 'auto',
      minWidth: '120px',
      '&:hover': {
        borderColor: 'hsl(var(--ring))'
      }
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? 'hsl(var(--primary))' 
        : state.isFocused 
          ? 'hsl(var(--accent))' 
          : 'hsl(var(--background))',
      color: state.isSelected 
        ? 'hsl(var(--primary-foreground))' 
        : 'hsl(var(--foreground))',
      '&:hover': {
        backgroundColor: state.isSelected 
          ? 'hsl(var(--primary))' 
          : 'hsl(var(--accent))'
      }
    }),
    menu: (provided: any) => ({
      ...provided,
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '6px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      zIndex: 999999
    }),
    menuList: (provided: any) => ({
      ...provided,
      maxHeight: '200px'
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))'
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: 'hsl(var(--foreground))'
    }),
    clearIndicator: (provided: any) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
      '&:hover': {
        color: 'hsl(var(--foreground))'
      }
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
      '&:hover': {
        color: 'hsl(var(--foreground))'
      }
    })
  };

  return (
    <div className={className}>
      <Select
        options={options}
        value={selectedOption}
        onChange={(option) => onChange(option?.value || null)}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isClearable
        isSearchable
        styles={customStyles}
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuPlacement="auto"
        noOptionsMessage={() => "No options available"}
        className="react-select-container"
        classNamePrefix="react-select"
      />
    </div>
  );
};

export default CascadingSelect;