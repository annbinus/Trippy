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
              <div
                onClick={() => onSelect(dest)}
                className="map-marker"
              />
            </Marker>
          ))}
        </Map>
      </div>
    </div>
  );
}

