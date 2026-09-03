import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Icon } from "./Icon";
import { toast } from "sonner";

interface AddressPickerMapProps {
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  initialAddress?: string;
}

export function AddressPickerMap({ onAddressSelect, initialAddress }: AddressPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  
  const [addressText, setAddressText] = useState(initialAddress || "");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !leafletMap.current || !marker.current) return;

    setSearching(true);
    try {
      let results = [];
      const trimmedQuery = searchQuery.trim();

      // 1. Try strictly on Sabaragamuwa University campus first
      const campusQuery = `${trimmedQuery}, Sabaragamuwa University, Belihuloya`;
      const campusResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(campusQuery)}&limit=1`
      );
      if (campusResponse.ok) {
        results = await campusResponse.json();
      }

      // 2. Fallback to Belihuloya town area
      if ((!results || results.length === 0) && !trimmedQuery.toLowerCase().includes("belihuloya")) {
        const cityQuery = `${trimmedQuery}, Belihuloya`;
        const cityResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=1`
        );
        if (cityResponse.ok) {
          results = await cityResponse.json();
        }
      }

      // 3. Fallback to raw query (useful for neighboring towns or general searches)
      if (!results || results.length === 0) {
        const rawResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmedQuery)}&limit=1`
        );
        if (rawResponse.ok) {
          results = await rawResponse.json();
        }
      }

      if (results && results.length > 0) {
        const { lat, lon, display_name } = results[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        // Pan map and relocate marker pin
        leafletMap.current.setView([latitude, longitude], 17);
        marker.current.setLatLng([latitude, longitude]);

        // Clean up display name to keep it concise
        const cleanName = display_name.split(",").slice(0, 3).join(",").trim();
        setAddressText(cleanName);
        onAddressSelect(cleanName, latitude, longitude);
        toast.success("Location found!");
      } else {
        toast.error("Location not found. Try searching for a broader landmark or area.");
      }
    } catch (err) {
      console.error("Geocoding search failed:", err);
      toast.error("Failed to search location. Check your internet connection.");
    } finally {
      setSearching(false);
    }
  };

  // Sabaragamuwa University of Sri Lanka campus coordinates
  const defaultCoords: [number, number] = [6.7146, 80.7872];

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (!response.ok) throw new Error("Geocode failed");
      const data = await response.json();
      
      const addr = data.address || {};
      const placeName = addr.amenity || addr.building || addr.road || addr.suburb || "";
      const university = addr.university || addr.institution || "";
      const city = addr.city || addr.town || addr.village || "Belihuloya";
      
      let cleanAddress = "";
      if (placeName) {
        cleanAddress = placeName;
      }
      if (university) {
        cleanAddress = cleanAddress ? `${cleanAddress}, ${university}` : university;
      } else {
        cleanAddress = cleanAddress ? `${cleanAddress}, Belihuloya` : city;
      }
      
      if (!cleanAddress) {
        cleanAddress = data.display_name.split(",").slice(0, 3).join(",").trim();
      }
      
      setAddressText(cleanAddress);
      onAddressSelect(cleanAddress, lat, lng);
    } catch (err) {
      console.error("Reverse geocoding error:", err);
      const coordsText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddressText(coordsText);
      onAddressSelect(coordsText, lat, lng);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Custom marker icon using Material Icons for a premium layout
    const customIcon = L.divIcon({
      html: `<span class="material-symbols-rounded text-primary text-4xl select-none filter drop-shadow-md" style="font-size: 38px; line-height: 1; transform: translate(-10px, -36px); display: inline-block;">location_on</span>`,
      className: "custom-leaflet-marker",
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });

    // Initialize Map centered on campus
    const mapInstance = L.map(mapRef.current, {
      zoomControl: false, // will position zoomed controls manually or standard
    }).setView(defaultCoords, 16);

    L.control.zoom({ position: "topright" }).addTo(mapInstance);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance);

    leafletMap.current = mapInstance;

    // Trigger invalidateSize after a brief delay to ensure map tiles render properly when toggled visible
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 100);

    // Create marker at center
    const markerInstance = L.marker(defaultCoords, {
      icon: customIcon,
      draggable: true,
    }).addTo(mapInstance);

    marker.current = markerInstance;

    // Set initial point address if empty
    if (!initialAddress) {
      void reverseGeocode(defaultCoords[0], defaultCoords[1]);
    }

    // Handle marker drag
    markerInstance.on("dragend", () => {
      const position = markerInstance.getLatLng();
      void reverseGeocode(position.lat, position.lng);
    });

    // Click map to move marker
    mapInstance.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      markerInstance.setLatLng(e.latlng);
      mapInstance.panTo(e.latlng);
      void reverseGeocode(lat, lng);
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Interactive Geocoder Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search campus building, hostel, faculty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 text-sm outline-none focus:border-primary placeholder:text-muted-foreground/75"
          />
          <button
            type="submit"
            disabled={searching}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            title="Search map"
          >
            {searching ? (
              <Icon name="progress_activity" className="animate-spin text-primary" size={16} />
            ) : (
              <Icon name="search" size={18} />
            )}
          </button>
        </div>
      </form>

      <div className="relative rounded-2xl overflow-hidden border border-border bg-muted shadow-inner z-10">
        <div ref={mapRef} className="h-64 w-full" style={{ zIndex: 1 }} />
        
        {/* Floating location details overlay */}
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-background/95 backdrop-blur-sm border border-border p-3 rounded-xl shadow-panel flex items-start gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
            <Icon name="location_on" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Selected Delivery Pin
            </p>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">
              {loading ? "Resolving coordinates..." : addressText || "Tap map to set address"}
            </p>
          </div>
          {loading && (
            <Icon name="progress_activity" className="animate-spin text-muted-foreground self-center shrink-0" size={16} />
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1 px-1">
        <Icon name="info" size={14} className="text-primary" />
        Click on the map or drag the red pin to fine-tune your delivery location.
      </p>
    </div>
  );
}
