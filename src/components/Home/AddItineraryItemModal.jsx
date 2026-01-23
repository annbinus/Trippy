import { useState } from "react";
import { getAuthHeaders } from "../../contexts/AuthContext";

export default function AddItineraryItemModal({ 
  onClose, 
  onAdd, 
  itineraryId, 
  destinationId,
  defaultDay = 1 
}) {
  const [form, setForm] = useState({
    type: "restaurant", // restaurant, museum, activity
    name: "",
    day: defaultDay || 1,
    notes: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      alert("Please enter a name");
      return;
    }

    setLoading(true);

    // Get the next position for this day
    const maxPosition = 100; // Default position, can be improved later

    const itemData = {
      itinerary_id: itineraryId,
      destination_id: destinationId,
      day: parseInt(form.day) || 1,
      position: maxPosition,
      notes: `${form.type === "restaurant" ? "🍽️ Restaurant: " : form.type === "museum" ? "🏛️ Museum: " : "🎯 Activity: "}${form.name}${form.notes ? ` - ${form.notes}` : ""}`,
    };

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${API_URL}/api/itinerary-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(itemData),
      });

      if (!res.ok) {
        throw new Error("Failed to add item");
      }

      const newItem = await res.json();
      onAdd(newItem);
      onClose();
    } catch (err) {
      console.error("Failed to add itinerary item:", err);
      alert("Failed to add item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal-form-title">
          Add to Itinerary
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Type Selection */}
          <div className="form-group">
            <label className="form-label">
              Type:
            </label>
            <div className="type-buttons">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "restaurant" })}
                className={`type-btn ${form.type === "restaurant" ? "type-btn-active" : ""}`}
              >
                🍽️ Restaurant
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "museum" })}
                className={`type-btn ${form.type === "museum" ? "type-btn-active" : ""}`}
              >
                🏛️ Museum
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "activity" })}
                className={`type-btn ${form.type === "activity" ? "type-btn-active" : ""}`}
              >
                🎯 Activity
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="form-group">
            <label className="form-label">
              Name <span className="required">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={form.type === "restaurant" ? "Restaurant name" : form.type === "museum" ? "Museum name" : "Activity name"}
              required
              className="form-input"
            />
          </div>

          {/* Day */}
          <div className="form-group">
            <label className="form-label">
              Day:
            </label>
            <input
              type="number"
              min="1"
              value={form.day}
              onChange={(e) => setForm({ ...form, day: parseInt(e.target.value) || 1 })}
              className="form-input"
            />
          </div>

          {/* Notes (Optional) */}
          <div className="form-group-lg">
            <label className="form-label">
              Notes (Optional):
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional details..."
              rows="3"
              className="form-textarea"
            />
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-submit"
            >
              {loading ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
