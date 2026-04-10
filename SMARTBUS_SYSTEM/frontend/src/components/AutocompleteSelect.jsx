import { useEffect, useMemo, useState } from "react";

export default function AutocompleteSelect({ label, options, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return options.slice(0, 12);
    return options
      .filter((option) => option.toLowerCase().startsWith(clean))
      .slice(0, 12);
  }, [options, query]);

  function selectOption(nextValue) {
    setQuery(nextValue);
    onChange(nextValue);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onInputKeyDown(event) {
    if (!open && event.key === "ArrowDown") {
      setOpen(true);
      setActiveIndex(0);
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1 >= filtered.length ? 0 : prev + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
    }
    if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      selectOption(filtered[activeIndex]);
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="auto-wrap">
      <label className="field-label">{label}</label>
      <input
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onInputKeyDown}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
      />
      {open ? (
        <div className="auto-menu">
          {filtered.length ? (
            filtered.map((option, index) => (
              <button
                key={option}
                className={`auto-item ${index === activeIndex ? "active" : ""}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="auto-empty">No matching stations</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
