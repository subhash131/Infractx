interface HeaderProps {
  selectedId: string | null;
  stageScale: number;
}

export const Header: React.FC<HeaderProps> = ({ selectedId, stageScale }) => (
  <div
    style={{
      padding: "15px 20px",
      background: "#f5f5f5",
      borderBottom: "1px solid #ddd",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <div>
      <h2 style={{ margin: "0 0 5px 0" }}>
        Infinite Canvas with Frame Snapping
      </h2>
      <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
        <strong>Scroll</strong> to zoom • <strong>Drag canvas</strong> to pan •{" "}
        <strong>Drag children</strong> to snap to their Frame edges
        {selectedId && (
          <span style={{ color: "#2196f3" }}>
            {" "}
            • Frame {selectedId} selected
          </span>
        )}
      </p>
    </div>
    <div
      style={{
        background: "#fff",
        padding: "8px 12px",
        borderRadius: "4px",
        border: "1px solid #ddd",
        fontSize: "14px",
      }}
    >
      Zoom: {Math.round(stageScale * 100)}%
    </div>
  </div>
);
