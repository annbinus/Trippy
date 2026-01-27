import Map, { Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYW5uYmludXMiLCJhIjoiY21rNHB3c2wxMDIxYjNlb3BzZnAyeHdqdiJ9.JBPzH4oT7DjWIMJaCjCuBw";
export default function MapSection({ destinations, onSelect }) {
  // Filter out destinations with invalid coordinates and convert strings to numbers
  const validDestinations = Array.isArray(destinations)
    ? destinations
        .map((dest) => ({
          ...dest,
          latitude: typeof dest.latitude === "string" ? parseFloat(dest.latitude) : dest.latitude,
          longitude: typeof dest.longitude === "string" ? parseFloat(dest.longitude) : dest.longitude,
        }))
        .filter(
          (dest) =>
            dest &&
            dest.id &&
            (typeof dest.latitude === "number" || typeof dest.latitude === "string") &&
            (typeof dest.longitude === "number" || typeof dest.longitude === "string") &&
            !isNaN(parseFloat(dest.latitude)) &&
            !isNaN(parseFloat(dest.longitude))
        )
        .map((dest) => ({
          ...dest,
          latitude: parseFloat(dest.latitude),
          longitude: parseFloat(dest.longitude),
        }))
    : [];

  return (
    <div className="map-section">
      <div className="panel card-wide panel-full-height">
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{
            latitude: 20,
            longitude: 0,
            zoom: 1.4,
          }}
          mapStyle="mapbox://styles/mapbox/standard-satellite"
          className="map-full"
        >
          {validDestinations.map((dest) => (
            <Marker
              key={dest.id}
              latitude={dest.latitude}
              longitude={dest.longitude}
              anchor="bottom"
            >
              <svg
                className="map-marker-svg"
                onClick={() => onSelect(dest)}
                width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ cursor: 'pointer' }}
              >
                <path d="M18 2C9.163 2 2 9.163 2 18c0 9.94 13.09 27.364 13.393 27.74a2 2 0 0 0 3.214 0C20.91 45.364 34 27.94 34 18c0-8.837-7.163-16-16-16z" fill="#4A3F3A" stroke="#fff" strokeWidth="2"/>
                <circle cx="18" cy="18" r="7" fill="#fff" fillOpacity="0.95"/>
                <circle cx="18" cy="18" r="4" fill="#4A3F3A" fillOpacity="0.85"/>
              </svg>
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
}

