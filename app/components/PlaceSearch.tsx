'use client'
import React, { useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { Input } from "@heroui/react";

interface Props {
  label: string;
  placeholder: string;
  onSelect: (place: google.maps.places.PlaceResult) => void;
}

export default function PlaceSearch({ label, placeholder, onSelect }: Props) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const handleLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (place) onSelect(place);
  };

  return (
    <Autocomplete onLoad={handleLoad} onPlaceChanged={handlePlaceChanged}>
      <div className="flex flex-col space-y-2 w-full">
        <label className="text-sm font-medium text-gray-600">{label}</label>
        <Input
          type="text"
          placeholder={placeholder}
          variant="bordered"
          className="w-full"
        />
      </div>
    </Autocomplete>
  );
}
