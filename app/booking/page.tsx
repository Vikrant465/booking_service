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
  CardBody,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalFooter,
} from '@heroui/react';
import { ArrowRight, MapPin, Car, Bike, Bus } from 'lucide-react';
import { useRouter } from 'next/navigation';
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

interface Place {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;

}

export default function BookingPage() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [dropCoords, setDropCoords] = useState<[number, number] | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDrop, setSearchingDrop] = useState(false);


  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const dropMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [routeData, setRouteData] = useState<{ distance: number; duration: number } | null>(null);
  const [showRideOptions, setShowRideOptions] = useState(false);

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // 🗺️ Initialize Map
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

    map.on('load', () => {
      map.on('click', async (e) => {
        const { lng, lat } = e.lngLat;

        try {
          const res = await axios.get(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}`
          );
          const placeName = res.data.features[0]?.place_name || 'Unknown location';

          if (searchingPickup) {
            setPickup(placeName);
            setPickupCoords([lng, lat]);
            addOrUpdateMarker([lng, lat], 'green', pickupMarkerRef);
          } else if (searchingDrop) {
            setDrop(placeName);
            setDropCoords([lng, lat]);
            addOrUpdateMarker([lng, lat], 'red', dropMarkerRef);
          }
        } catch (err) {
          console.error('Reverse geocode failed', err);
        }
      });
    });

    return () => map.remove();
  }, []);

  // 🔍 Search Handler
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&autocomplete=true&limit=5`
      );
      setResults(res.data.features);
    } catch (err) {
      console.error('Mapbox search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 📍 When user selects pickup/drop
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
  };

  // 🟢 Marker Helper
  const addOrUpdateMarker = (
    coords: [number, number],
    color: string,
    ref: React.MutableRefObject<mapboxgl.Marker | null>
  ) => {
    if (!mapRef.current) return;
    if (ref.current) {
      ref.current.setLngLat(coords);
    } else {
      ref.current = new mapboxgl.Marker({ color })
        .setLngLat(coords)
        .addTo(mapRef.current);
    }
  };

  // 🧭 Fit map to both
  const fitBothLocations = (p: [number, number], d: [number, number]) => {
    const bounds = new LngLatBounds();
    bounds.extend(p);
    bounds.extend(d);
    mapRef.current?.fitBounds(bounds, { padding: 100 });
  };

  // 🚗 Draw route
  const drawRoute = async (p: [number, number], d: [number, number]) => {
    if (!mapRef.current) return;
    const res = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${p[0]},${p[1]};${d[0]},${d[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`
    );
    const route = res.data.routes[0].geometry;
    const distance = res.data.routes[0].distance / 1000;
    const duration = res.data.routes[0].duration / 60;
    setRouteData({ distance, duration });

    if (mapRef.current.getSource('route')) {
      mapRef.current.removeLayer('route');
      mapRef.current.removeSource('route');
    }

    mapRef.current.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: route },
    });

    mapRef.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      paint: { 'line-color': '#1E90FF', 'line-width': 5 },
    });
  };

  // 🧩 Show path
  const selectRide = async () => {
    if (!pickupCoords || !dropCoords) return;
    fitBothLocations(pickupCoords, dropCoords);
    await drawRoute(pickupCoords, dropCoords);
    setShowRideOptions(true);
  };

  // 💰 Fare calculation
  const calculateFare = (type: string) => {
    if (!routeData) return 0;
    const base = type === 'Car' ? 20 : type === 'Bike' ? 10 : 15;
    return (routeData.distance * base).toFixed(2);
  };

  // ✅ Confirm Booking
  const handleConfirm = () => {
    setIsModalOpen(false);

    // router.push('/finding');
    if (!pickupCoords || !dropCoords || !pickup || !drop) return;

    const params = new URLSearchParams({
      pickup: pickup,
      drop: drop,
      pickupLat: pickupCoords[1].toString(),
      pickupLng: pickupCoords[0].toString(),
      dropLat: dropCoords[1].toString(),
      dropLng: dropCoords[0].toString(),
      type: selectedType ?? '',
    });

    router.push(`/finding?${params.toString()}`);
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
              <Listbox>
                {results.map((place) => (
                  <ListboxItem key={place.id} onClick={() => handleSelect(place)}>
                    {place.place_name}
                  </ListboxItem>
                ))}
              </Listbox>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Map */}
      <div ref={mapContainer} className="flex-1" />

      {/* Action Buttons & Ride Selection */}
      <div className="gap-2 bg-gray-50 border-t flex flex-col items-center p-2">
        <Button
          color="primary"
          size="lg"
          className="w-full max-w-md"
          onPress={selectRide}
        >
          Show Path
        </Button>

        {/* ✅ Ride Options appear below */}
        {showRideOptions && routeData && (
          <div className="w-full max-w-md bg-white rounded-xl shadow-md p-3 mt-2">
            <h3 className="text-lg font-semibold mb-2">Select Your Ride</h3>
            <p className="text-gray-500 text-sm mb-3">
              Distance: {routeData.distance.toFixed(2)} km | Time: {routeData.duration.toFixed(0)} mins
            </p>
            <div className="flex flex-col gap-2">
              {[
                { type: 'Car', icon: <Car className="text-blue-500" /> },
                { type: 'Bike', icon: <Bike className="text-green-500" /> },
                { type: 'Auto', icon: <Bus className="text-yellow-500" /> },
              ].map(({ type, icon }) => (
                <Button
                  key={type}
                  variant="flat"
                  className="flex justify-between items-center"
                  onPress={() => {
                    setSelectedType(type);
                    setIsModalOpen(true);
                  }}
                >
                  <div className="flex gap-2 items-center">
                    {icon}
                    <span className="font-medium">{type}</span>
                  </div>
                  <span className="text-gray-600 font-medium">₹{calculateFare(type)}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* ✅ Confirmation Modal */}
      <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen} placement="center">
        <ModalContent>
          <ModalHeader className="text-lg font-semibold">Confirm Your Ride</ModalHeader>
          <ModalBody className="space-y-3">
            <p><span className="font-medium text-gray-700">Pickup:</span> {pickup}</p>
            <p><span className="font-medium text-gray-700">Destination:</span> {drop}</p>
            <p><span className="font-medium text-gray-700">Distance:</span> {routeData?.distance.toFixed(2)} km</p>
            <p><span className="font-medium text-gray-700">Time:</span> {routeData?.duration.toFixed(0)} mins</p>
            <p><span className="font-medium text-gray-700">Ride Type:</span> {selectedType}</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" color="default" onPress={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleConfirm}>
              Confirm Ride
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>

  );
}
