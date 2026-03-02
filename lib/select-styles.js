// Shared react-select dark theme styles
export const selStyles = {
  control: (b) => ({
    ...b,
    background: "transparent",
    borderColor: "#334155",
    minHeight: 32,
    height: 32,
    fontSize: 12,
    boxShadow: "none",
    cursor: "pointer",
  }),
  valueContainer: (b) => ({ ...b, padding: "0 8px", height: 32 }),
  indicatorsContainer: (b) => ({ ...b, height: 32 }),
  dropdownIndicator: (b) => ({ ...b, padding: "0 6px" }),
  singleValue: (b) => ({ ...b, color: "#e2e8f0" }),
  menu: (b) => ({ ...b, background: "#1e293b", border: "1px solid #334155" }),
  option: (b, s) => ({
    ...b,
    background: s.isSelected ? "#00d1b2" : s.isFocused ? "#334155" : "#1e293b",
    color: s.isSelected ? "#020617" : "#e2e8f0",
    fontSize: 12,
  }),
  indicatorSeparator: () => ({ display: "none" }),
};
