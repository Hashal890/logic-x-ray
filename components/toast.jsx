// timer logic lives in app.jsx's showToast, this just renders
export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#0f172a",
        border: "1px solid #00d1b2",
        borderRadius: 8,
        padding: "9px 18px",
        color: "#5eead4",
        fontSize: 12.5,
        fontWeight: 500,
        boxShadow: "0 4px 16px rgba(0,0,0,.4)",
        zIndex: 30,
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      {message}
    </div>
  );
}
