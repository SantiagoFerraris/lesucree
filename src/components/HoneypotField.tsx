interface HoneypotFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function HoneypotField({ value, onChange }: HoneypotFieldProps) {
  return (
    <input
      type="text"
      name="website"
      value={value}
      onChange={onChange}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        opacity: 0,
        height: 0,
        width: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
