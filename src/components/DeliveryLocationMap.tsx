import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Icon } from "./Icon";

interface DeliveryLocationMapProps {
  address: string;
}

export function DeliveryLocationMap({ address }: DeliveryLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [loading, setLoading] = useState(true);

  // Sabaragamuwa University campus coordinates
  const defaultCoords: [number, number] = [6.7146, 80.7872];

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize leaflet map instance
    const mapInstance = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(defaultCoords, 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(mapInstance);

    // Custom Red Marker Pin Icon
    const redIcon = L.icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const markerInstance = L.marker(defaultCoords, { icon: redIcon }).addTo(mapInstance);

    leafletMap.current = mapInstance;
    marker.current = markerInstance;

    // Geocode address on-the-fly via Nominatim
    const geocodeAddress = async () => {
      setLoading(true);
      try {
        let query = address.trim();
        if (!query.toLowerCase().includes("belihuloya") && !query.toLowerCase().includes("sabaragamuwa")) {
          query = `${query}, Sabaragamuwa University, Belihuloya`;
        }

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        );
        if (!response.ok) throw new Error("Geocoding request failed");
        
        const results = await response.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lon = parseFloat(results[0].lon);
          
          if (leafletMap.current && marker.current) {
            leafletMap.current.setView([lat, lon], 17);
            marker.current.setLatLng([lat, lon]);
            marker.current.bindPopup(`<b>Destination:</b><br/>${address}`).openPopup();
          }
        } else {
          // Fallback 1: Broad search under Belihuloya
          if (address.trim() && !address.toLowerCase().includes("belihuloya")) {
            const fallbackResponse = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim() + ", Belihuloya")}&limit=1`
            );
            if (fallbackResponse.ok) {
              const fallbackResults = await fallbackResponse.json();
              if (fallbackResults && fallbackResults.length > 0) {
                const lat = parseFloat(fallbackResults[0].lat);
                const lon = parseFloat(fallbackResults[0].lon);
                if (leafletMap.current && marker.current) {
                  leafletMap.current.setView([lat, lon], 17);
                  marker.current.setLatLng([lat, lon]);
                  marker.current.bindPopup(`<b>Destination:</b><br/>${address}`).openPopup();
                }
                return;
              }
            }
          }
          // Fallback 2: Keep default center but marker popup alert
          markerInstance.bindPopup(`<b>Coordinate unresolved</b><br/>Showing campus center for: ${address}`).openPopup();
        }
      } catch (err) {
        console.error("Geocoding failed for delivery map:", err);
      } finally {
        setLoading(false);
        // Force Leaflet to recalculate containers in toggle view
        setTimeout(() => {
          mapInstance.invalidateSize();
        }, 100);
      }
    };

    void geocodeAddress();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [address]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-muted h-48 w-full shadow-inner z-10">
      <div ref={mapRef} className="h-full w-full" style={{ zIndex: 1 }} />
      {loading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
          <Icon name="progress_activity" className="animate-spin text-primary" size={20} />
        </div>
      )}
    </div>
  );
}
