'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl, { Map } from 'mapbox-gl';
import axios from 'axios';
import { Button, Input, Listbox, ListboxItem, Spinner, Tooltip } from '@heroui/react';
import { LocateFixed } from 'lucide-react';
import { signIn, signOut, useSession } from "next-auth/react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

interface Place {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;
  place_type?: string[];
  context?: { text: string }[];
}

export default function Page() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const { data: session,status } = useSession();
  const isAuthenticated = status === "authenticated";

  // ✅ Initialize Mapbox
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.209, 28.6139], // Default: New Delhi
      zoom: 11,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    mapRef.current = map;

    // ✅ Auto-locate user when map loads
    locateUser(map);

    return () => map.remove();
  }, []);

  // 🔍 Handle search query (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const fetchPlaces = async () => {
      setLoading(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=5`;
        const res = await axios.get(url);
        setResults(res.data.features);
      } catch (error) {
        console.error('Mapbox Geocoding Error:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchPlaces, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // 📍 When user selects a place
  const handleSelect = (place: Place) => {
    const coords = place.center;
    mapRef.current?.flyTo({ center: coords, zoom: 14 });

    if (markerRef.current) {
      markerRef.current.setLngLat(coords);
    } else {
      markerRef.current = new mapboxgl.Marker({ color: '#1E90FF' })
        .setLngLat(coords)
        .addTo(mapRef.current!);
    }

    setQuery(place.place_name);
    setResults([]);

    // ✅ Blur input to close suggestions immediately
    const inputElement = document.querySelector<HTMLInputElement>('input[type="text"]');
    inputElement?.blur();
  };

  // 🧭 Locate user and center map
  const locateUser = (map?: Map) => {
    const targetMap = map || mapRef.current;
    if (!targetMap || !navigator.geolocation) return;

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        targetMap.flyTo({ center: [longitude, latitude], zoom: 14 });

        // Create or update user marker
        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat([longitude, latitude]);
        } else {
          userMarkerRef.current = new mapboxgl.Marker({ color: '#22c55e' })
            .setLngLat([longitude, latitude])
            .setPopup(new mapboxgl.Popup().setText('You are here'))
            .addTo(targetMap);
        }

        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="flex flex-col h-screen relative">
      {/* Header */}
      <div className="p-3 flex justify-between items-center shadow-md bg-white z-20">
        <h1 className="text-lg font-semibold text-gray-800">title</h1>
        
        {isAuthenticated ? (
          <>
              <p className="text-sm font-medium">
                Hello, {session?.user?.name || "User"}
              </p>
           
              <Button size="sm" color="danger" variant="ghost" onPress={() => signOut()}>
                Sign Out
              </Button>
          </>
        ) : (
          <>
            <Button size="sm" color="primary" onPress={() => signIn("google")}>
              Google Login
            </Button>
          </>
        )}

      </div>

      {/* Search Bar */}
      <div className="absolute top-16 left-0 right-0 z-30 flex justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-3">
          <Input
            type="text"
            placeholder="Search for a place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            endContent={loading ? <Spinner size="sm" /> : null}
          />
          {results.length > 0 && (
            <div className="bg-white mt-2 rounded-lg shadow-md border border-gray-200 max-h-60 overflow-y-auto">
              <Listbox aria-label="Search results">
                {results.map((place) => (
                  <ListboxItem
                    key={place.id}
                    onClick={() => handleSelect(place)}
                    textValue={place.place_name}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{place.text}</span>
                      <span className="text-gray-500 text-sm">
                        {place.place_type?.[0] ||
                          place.context?.[0]?.text ||
                          'Location'}
                      </span>
                    </div>
                  </ListboxItem>
                ))}
              </Listbox>
            </div>
          )}
        </div>
      </div>

      {/* 🗺️ Map Section */}
      <div ref={mapContainer} className="flex-1" />

      {/* 📍 Floating Locate Me Button */}
      <div className="absolute bottom-34 left-5 z-30">
        <Tooltip content="Locate Me" color="secondary" placement="right">
          <Button
            onPress={() => locateUser()}
            disabled={locating}
            className={`
              relative w-14 h-14 rounded-full flex items-center justify-center
              transition-all duration-200 ease-in-out
              ${locating ? 'opacity-70' : 'hover:scale-105 active:scale-95'}
              shadow-lg shadow-blue-500/30
              bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-500
              text-white
            `}
          >
            {locating ? (
              <Spinner color="white" size="sm" />
            ) : (
              <LocateFixed className="w-6 h-6" />
            )}
            {/* Subtle glow ring */}
            <span className="absolute inset-0 rounded-full bg-blue-400/20 blur-lg animate-pulse" />
          </Button>
        </Tooltip>
      </div>

      {/* Footer buttons */}
      <div className="p-4 bg-gray-50 border-t flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button fullWidth color="primary" variant="shadow" className="sm:w-auto">
          Book Ride
        </Button>
        <Button fullWidth color="secondary" variant="flat" className="sm:w-auto">
          View History
        </Button>
      </div>
    </div>
  );
}