import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import MapSection from "./MapSection";
import DestinationsPanel from "./DestinationPanel";
import AdventureBar from "./AdventureBar";

export default function Home() {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState([]);
  const [selected, setSelected] = useState(null);

  // Handle itinerary selection - navigate to saved itinerary page
  const handleDestinationSelect = async (destination) => {
    setSelected(destination);
    
    // All items are now itineraries, so navigate directly to the saved itinerary page
    if (destination.isItinerary) {
      navigate(`/saved-itinerary/${destination.itineraryId}`);
      return;
    }
  };

  // Handle itinerary deletion
  const handleDestinationDelete = async (destination) => {
    try {
      // Delete saved itinerary
      const res = await fetch(`http://localhost:5001/api/itineraries/${destination.itineraryId}`, {
        method: "DELETE"
      });
      
      if (!res.ok) {
        throw new Error("Failed to delete itinerary");
      }
      
      // Remove from local state
      setDestinations(prev => prev.filter(d => d.id !== destination.id));
    } catch (err) {
      console.error("Failed to delete itinerary:", err);
      alert("Failed to delete itinerary. Please try again.");
    }
  };

  // Fetch only saved itineraries
  const fetchAllData = async () => {
    try {
      // Fetch saved itineraries and convert them to destination-like objects
      const itinRes = await fetch("http://localhost:5001/api/itineraries");
      if (itinRes.ok) {
        const itineraries = await itinRes.json();
        
        // Convert each itinerary to a destination-like object
        const itineraryDestinations = await Promise.all(
          itineraries.map(async (itinerary) => {
            // Get the first destination from the itinerary items to use coordinates
            try {
              const itemsRes = await fetch(`http://localhost:5001/api/itinerary-items?itinerary_id=${itinerary.id}`);
              if (itemsRes.ok) {
                const items = await itemsRes.json();
                let destinationNames = [];
                let preferences = [];
                let latitude = 40.7128; // Default NYC
                let longitude = -74.0060;
                
                if (items.length > 0 && items[0].notes) {
                  try {
                    const data = JSON.parse(items[0].notes);
                    destinationNames = data.destinations || [];
                    preferences = data.preferences || [];
                    
                    // Use stored coordinates if available
                    if (data.coordinates) {
                      latitude = data.coordinates.latitude;
                      longitude = data.coordinates.longitude;
                      console.log(`Using stored coordinates for ${itinerary.title}: (${latitude}, ${longitude})`);
                    }
                    
                  } catch (jsonError) {
                    // Handle case where notes is not valid JSON
                    destinationNames = [itinerary.title];
                    preferences = [];
                  }
                }
                
                return {
                  id: `itinerary-${itinerary.id}`,
                  name: itinerary.title,
                  description: `${items.length} days${destinationNames.length > 0 ? ' • ' + destinationNames.join(", ") : ""}${preferences.length > 0 ? ' • ' + preferences.slice(0, 2).join(", ") : ""}`,
                  latitude,
                  longitude,
                  image_url: "/assets/pic1.webp",
                  created_at: itinerary.created_at,
                  isItinerary: true,
                  itineraryId: itinerary.id
                };
              }
            } catch (err) {
              console.error("Error processing itinerary:", err);
              return {
                id: `itinerary-${itinerary.id}`,
                name: itinerary.title,
                description: "Saved itinerary",
                latitude: 40.7128,
                longitude: -74.0060,
                image_url: "/assets/pic1.webp",
                created_at: itinerary.created_at,
                isItinerary: true,
                itineraryId: itinerary.id
              };
            }
          })
        );
        
        setDestinations(itineraryDestinations);
      } else {
        setDestinations([]);
      }
    } catch (err) {
      console.error("Failed to fetch itineraries:", err);
      setDestinations([]);
    }
  };
    
  // Fetch data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  return (
    <div className="home-layout">
      {/* Navbar */}
      <Navbar />
      <AdventureBar onGenerate={() => navigate("/generate")} />

      {/* Main content */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pad-inner pad-vertical-md main-fixed">
        {/* Left: Map */}
        <div className="map-fixed">
          <MapSection destinations={destinations} onSelect={handleDestinationSelect} />
        </div>

        {/* Right: Panels */}
        <div className="fill-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '1rem', overflow: 'hidden' }}>
          <DestinationsPanel
            destinations={destinations}
            onSelect={handleDestinationSelect}
            onDelete={handleDestinationDelete}
          />
        </div>
      </main>
    </div>
  );
}
