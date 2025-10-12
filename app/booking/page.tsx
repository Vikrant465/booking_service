'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl, { Map, LngLatBounds } from 'mapbox-gl';
import axios from 'axios';
import {
  Input,
  Button,
  Listbox,
  ListboxItem,
  Spinner,
  Card,
  CardBody
} from '@heroui/react';
import { ArrowRight, MapPin } from 'lucide-react';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

interface Place {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;
  place_type?: string[];
  context?: { text: string }[];
}

export default function BookingPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropCoords, setDropCoords] = useState<[number, number] | null>(null);

  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDrop, setSearchingDrop] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.209, 28.6139],
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    mapRef.current = map;

    return () => map.remove();
  }, []);

  // 🔍 Handle Mapbox search
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=5&types=place,address,poi`;
      const res = await axios.get(url);
      setResults(res.data.features);
    } catch (err) {
      console.error('Mapbox search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 📍 When user selects pickup or drop
  const handleSelect = (place: Place) => {
    const coords = place.center;
    setResults([]);

    if (searchingPickup) {
      setPickup(place.place_name);
      setPickupCoords(coords);
      addOrUpdateMarker(coords, 'green', pickupMarkerRef);
    } else if (searchingDrop) {
      setDrop(place.place_name);
      setDropCoords(coords);
      addOrUpdateMarker(coords, 'red', dropMarkerRef);
    }

    mapRef.current?.flyTo({ center: coords, zoom: 13 });

    // 👇 If both selected, fit view & draw route
    if (pickupCoords && dropCoords) {
      fitBothLocations(pickupCoords, dropCoords);
      drawRoute(pickupCoords, dropCoords);
    }
    
  };

  // 🟢 Add or update marker helper
  const addOrUpdateMarker = (
    coords: [number, number],
    color: string,
    markerRef: React.MutableRefObject<mapboxgl.Marker | null>
  ) => {
    if (markerRef.current) {
      markerRef.current.setLngLat(coords);
    } else {
      markerRef.current = new mapboxgl.Marker({ color })
        .setLngLat(coords)
        .addTo(mapRef.current!);
    }
  };

  // 🗺️ Fit map to both pickup & drop
  const fitBothLocations = (pickupCoords: [number, number], dropCoords: [number, number]) => {
    if (!mapRef.current) return;

    const bounds = new LngLatBounds();
    bounds.extend(pickupCoords);
    bounds.extend(dropCoords);

    mapRef.current.fitBounds(bounds, {
      padding: 100,
      animate: true,
      duration: 1000,
    });
  };

  // 🧭 Draw route between pickup and drop
  const drawRoute = async (pickup: [number, number], drop: [number, number]) => {
    if (!mapRef.current) return;

    try {
      const res = await axios.get(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup[0]},${pickup[1]};${drop[0]},${drop[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );

      const route = res.data.routes[0].geometry;

      // Remove any existing route
      if (mapRef.current.getSource('route')) {
        mapRef.current.removeLayer('route');
        mapRef.current.removeSource('route');
      }

      // Add new route
      mapRef.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route,
        },
      });

      mapRef.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#1E90FF',
          'line-width': 5,
        },
      });
    } catch (error) {
      console.error('Error drawing route:', error);
    }
  };

  // 🚗 Confirm Ride Button
  const selectRide = async () => {
    if (!pickupCoords || !dropCoords) {
      alert('Please select both pickup and drop locations.');
      return;
    }

    console.log('Booking:', {
      pickup,
      drop,
      pickupCoords,
      dropCoords,
    });

    fitBothLocations(pickupCoords, dropCoords);
    await drawRoute(pickupCoords, dropCoords);
  };

  return (
    <div className="flex flex-col h-screen relative">
      {/* Header */}
      <div className="p-4 bg-white shadow-md text-center font-semibold text-lg">
        Book Your Ride
      </div>

      {/* Search Inputs */}
      <div className="absolute z-30 top-16 left-0 right-0 px-4">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardBody className="flex flex-col gap-3">
            {/* Pickup */}
            <Input
              startContent={<MapPin className="text-green-500" />}
              placeholder="Pickup location"
              value={pickup}
              onChange={(e) => {
                setPickup(e.target.value);
                setSearchingPickup(true);
                setSearchingDrop(false);
                handleSearch(e.target.value);
              }}
              endContent={loading && searchingPickup ? <Spinner size="sm" /> : null}
            />

            {/* Drop */}
            <Input
              startContent={<ArrowRight className="text-red-500" />}
              placeholder="Drop location"
              value={drop}
              onChange={(e) => {
                setDrop(e.target.value);
                setSearchingDrop(true);
                setSearchingPickup(false);
                handleSearch(e.target.value);
              }}
              endContent={loading && searchingDrop ? <Spinner size="sm" /> : null}
            />

            {/* Search Results */}
            {results.length > 0 && (
              <div className="bg-white border rounded-lg mt-2 max-h-56 overflow-y-auto">
                <Listbox aria-label="Search results">
                  {results.map((place) => (
                    <ListboxItem key={place.id} onClick={() => handleSelect(place)}>
                      <div className="flex flex-col">
                        <span className="font-medium">{place.text}</span>
                        <span className="text-gray-500 text-sm">{place.place_name}</span>
                      </div>
                    </ListboxItem>
                  ))}
                </Listbox>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="flex-1" />

      {/* Confirm Button */}
      <div className="p-4 bg-gray-50 border-t flex justify-center">
        <Button
          color="primary"
          size="lg"
          className="w-full max-w-md"
          onPress={selectRide}
        >
          Confirm Ride
        </Button>
      </div>
    </div>
  );
}
