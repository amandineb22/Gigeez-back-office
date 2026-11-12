import { Input } from "@/components/ui/Field";

/**
 * Free-text location with the locations already in use offered as
 * suggestions, so a brand-new boutique can be typed in while existing ones
 * keep their exact spelling.
 */
export function LocationInput({
  id,
  name,
  locations,
  defaultValue,
  placeholder = "e.g. WHSE",
  className,
}: {
  id: string;
  name: string;
  locations: string[];
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}) {
  const listId = `${id}-options`;
  return (
    <>
      <Input
        id={id}
        name={name}
        list={listId}
        required
        autoComplete="off"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={className}
      />
      <datalist id={listId}>
        {locations.map((loc) => (
          <option key={loc} value={loc} />
        ))}
      </datalist>
    </>
  );
}
