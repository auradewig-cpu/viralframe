import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

export interface ComboboxOption {
  value: string;
  label: string;
}

// Dropdown identitas searchable (cmdk) — dipakai grid Referensi Visual di Step1Business.tsx.
// Generik lewat prop `options` supaya bisa disisipi opsi "👤 Karakter" di atas ROOM_IDENTITIES
// tanpa menduplikasi komponen combobox itu sendiri.
export function RoomIdentityCombobox({ value, options, onSelect, placeholder = 'Pilih identitas...' }: {
  value: string; options: ComboboxOption[]; onSelect: (value: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none text-left flex items-center justify-between gap-2"
          style={{ background: 'var(--vf-bg-elevated)', color: selected ? 'var(--vf-text-primary)' : 'var(--vf-text-muted)', border: '1px solid var(--vf-border)' }}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown size={14} className="shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[280px]">
        <Command>
          <CommandInput placeholder="Cari identitas..." />
          <CommandList>
            <CommandEmpty>Tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem key={o.value} value={o.label} onSelect={() => { onSelect(o.value); setOpen(false); }}>
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
