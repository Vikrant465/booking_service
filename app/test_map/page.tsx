'use client'
import React, { useState, useEffect } from "react";
import { GoogleMap, Marker, LoadScript } from "@react-google-maps/api";
import { Card, CardBody, Button } from "@heroui/react";
import PlaceSearch from "../components/PlaceSearch";

const libraries: ("places")[] = ["places"];

export default function HomePage() {
  const [pickup, setPickup] = useState<google.maps.LatLngLiteral | null>(null);
  const [drop, setDrop] = useState<google.maps.LatLngLiteral | null>(null);
  const [center, setCenter] = useState<google.maps.LatLngLiteral>({
    lat: 28.6139, // default: New Delhi
    lng: 77.2090,
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
      libraries={libraries}
    >
      <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
        <h1 className="text-2xl font-bold mb-4">🚖 Taxi Booking</h1>

        {/* Search Panel */}
        <Card className="w-full max-w-md mb-4 shadow-xl border">
          <CardBody className="space-y-4">
            <PlaceSearch
              label="Pickup Location"
              placeholder="Enter pickup point"
              onSelect={(place) => {
                if (place.geometry?.location) {
                  const location = place.geometry.location;
                  setPickup({ lat: location.lat(), lng: location.lng() });
                  setCenter({ lat: location.lat(), lng: location.lng() });
                }
              }}
            />

            <PlaceSearch
              label="Drop Location"
              placeholder="Enter drop point"
              onSelect={(place) => {
                if (place.geometry?.location) {
                  const location = place.geometry.location;
                  setDrop({ lat: location.lat(), lng: location.lng() });
                  setCenter({ lat: location.lat(), lng: location.lng() });
                }
              }}
            />

            <Button
              color="primary"
              variant="solid"
              className="w-full mt-3"
              onPress={() => {
                if (!pickup || !drop) {
                  alert("Please select both locations.");
                } else {
                  console.log("Pickup:", pickup, "Drop:", drop);
                }
              }}
            >
              Confirm Ride
            </Button>
          </CardBody>
        </Card>

        {/* Map Section */}
        <div className="w-full h-[70vh] max-w-4xl rounded-2xl overflow-hidden shadow-2xl">
          <GoogleMap
            mapContainerStyle={{ width: "100%", height: "100%" }}
            center={center}
            zoom={13}
          >
            {pickup && <Marker position={pickup} label="P" />}
            {drop && <Marker position={drop} label="D" />}
          </GoogleMap>
        </div>
      </div>
    </LoadScript>
  );
}
