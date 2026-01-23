import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import AddItineraryItemModal from "./AddItineraryItemModal";
import { getAuthHeaders } from "../../contexts/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function ItineraryPage() {
  const { itineraryId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDestinationId = searchParams.get("destinationId");

  const [itinerary, setItinerary] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState(null);
  const [itineraryItems, setItineraryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch itinerary details
  useEffect(() => {
    if (!itineraryId) return;

    fetch(`${API_URL}/api/itineraries/${itineraryId}`, {
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch itinerary");
        return res.json();
      })
      .then((data) => {
        setItinerary(data);
      })
      .catch((err) => {
        console.error("Failed to fetch itinerary:", err);
      });
  }, [itineraryId]);

  // Fetch destinations in this itinerary
  useEffect(() => {
    if (!itineraryId) return;

    fetch(`${API_URL}/api/itineraries/${itineraryId}/destinations`, {
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch destinations");
        return res.json();
      })
      .then((data) => {
        const normalizedData = Array.isArray(data)
          ? data.map((dest) => ({
              ...dest,
              latitude: typeof dest.latitude === "string" ? parseFloat(dest.latitude) : dest.latitude,
              longitude: typeof dest.longitude === "string" ? parseFloat(dest.longitude) : dest.longitude,
            }))
          : [];
        setDestinations(normalizedData);
        
        // Set initial selected destination
        if (normalizedData.length > 0) {
          const destId = initialDestinationId 
            ? parseInt(initialDestinationId)
            : normalizedData[0].id;
          setSelectedDestinationId(destId);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch destinations:", err);
        setDestinations([]);
      });
  }, [itineraryId, initialDestinationId]);

  // Fetch itinerary items for selected destination
  useEffect(() => {
    if (!selectedDestinationId) {
      setItineraryItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_URL}/api/itinerary-items?destination_id=${selectedDestinationId}`, {
      headers: getAuthHeaders()
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch itinerary items");
        return res.json();
      })
      .then((data) => {
        // Filter items that belong to this itinerary
        const filteredItems = Array.isArray(data)
          ? data.filter((item) => item.itinerary_id === parseInt(itineraryId))
          : [];
        setItineraryItems(filteredItems);
      })
      .catch((err) => {
        console.error("Failed to fetch itinerary items:", err);
        setItineraryItems([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedDestinationId, itineraryId]);

  const selectedDestination = destinations.find((d) => d.id === selectedDestinationId);

  // Group items by day
  const itemsByDay = itineraryItems.reduce((acc, item) => {
    const day = item.day || "Unassigned";
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(item);
    return acc;
  }, {});

  const sortedDays = Object.keys(itemsByDay).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return Number(a) - Number(b);
  });

  return (
    <div className="itinerary-page">
      {/* Header */}
      <div className="itinerary-header">
        <button
          onClick={() => navigate("/home")}
          className="back-btn"
        >
          ← Back to Destinations
        </button>
        
        <h1 className="h2-md mb-05">
          {itinerary?.title || "Itinerary"}
        </h1>
      </div>

      {/* Destination Selector */}
      {destinations.length > 1 && (
        <div className="destination-selector">
          <label className="selector-label">
            Select Destination:
          </label>
          <select
            value={selectedDestinationId || ""}
            onChange={(e) => setSelectedDestinationId(parseInt(e.target.value))}
            className="selector-dropdown"
          >
            {destinations.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Selected Destination Info */}
      {selectedDestination && (
        <div className="panel mb-2">
          <h2 className="destination-info-title">
            {selectedDestination.name}
          </h2>
          {selectedDestination.description && (
            <p className="muted">{selectedDestination.description}</p>
          )}
        </div>
      )}

      {/* Add Button */}
      {selectedDestinationId && (
        <div className="mb-1">
          <button
            onClick={() => setShowAddModal(true)}
            className="add-item-btn"
          >
            + Add Item
          </button>
        </div>
      )}

      {/* Itinerary Items by Day */}
      <div className="panel">
        <div className="items-header">
          <h2 className="h2-md m-0">
            Itinerary Items
          </h2>
        </div>

        {loading ? (
          <p className="muted">Loading itinerary...</p>
        ) : itineraryItems.length === 0 ? (
          <div className="empty-state-container">
            <p className="muted">No itinerary items yet for this destination</p>
            <p className="empty-state-hint">
              Add museums, restaurants, and activities to plan your trip
            </p>
          </div>
        ) : (
          <div className="scroll-container">
            {sortedDays.map((day) => (
              <div key={day} className="day-section">
                <h3 className="day-title">
                  Day {day}
                </h3>
                <div className="items-column">
                  {itemsByDay[day]
                    .sort((a, b) => (a.position || 0) - (b.position || 0))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="itinerary-item-card"
                      >
                        <div>
                          {item.notes ? (
                            <p className="item-note">
                              {item.notes}
                            </p>
                          ) : (
                            <p className="muted item-note-fallback">
                              Itinerary item #{item.position || item.id}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && selectedDestinationId && (
        <AddItineraryItemModal
          onClose={() => setShowAddModal(false)}
          onAdd={(newItem) => {
            // Refetch to get updated list with full data
            fetch(`${API_URL}/api/itinerary-items?destination_id=${selectedDestinationId}`, {
              headers: getAuthHeaders()
            })
              .then((res) => res.json())
              .then((data) => {
                const filteredItems = Array.isArray(data)
                  ? data.filter((item) => item.itinerary_id === parseInt(itineraryId))
                  : [];
                setItineraryItems(filteredItems);
              })
              .catch((err) => {
                console.error("Failed to refresh itinerary items:", err);
              });
          }}
          itineraryId={parseInt(itineraryId)}
          destinationId={selectedDestinationId}
          defaultDay={sortedDays.length > 0 && sortedDays[0] !== "Unassigned" ? parseInt(sortedDays[0]) : 1}
        />
      )}
    </div>
  );
}
