export default function DestinationsPanel({ destinations, onSelect, onDelete }) {
  // Ensure destinations is always an array
  const safeDestinations = Array.isArray(destinations) ? destinations : [];

  const handleDelete = (e, dest) => {
    e.stopPropagation(); // Prevent triggering onSelect
    if (window.confirm(`Delete "${dest.name}"?`)) {
      onDelete(dest);
    }
  };

  return (
    <div className="panel fill-scroll pad-vertical-md pad-inner dest-panel">
      <h2 className="h2-md">Destinations ({safeDestinations.length})</h2>

      <div className="scroll-body">
        {safeDestinations.map((dest) => (
          <div
            key={dest.id}
            onClick={() => onSelect(dest)}
            className="card card-item destination-card"
          >
            <h3 className="fw-semibold">{dest.name}</h3>
            <p className="muted">{dest.description}</p>
            
            <button
              onClick={(e) => handleDelete(e, dest)}
              className="delete-btn"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
