'use client';
import { Suspense } from 'react';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { useSearchParams } from 'next/navigation';
import { Card, CardBody, Button, Modal, ModalBody, ModalContent, ModalHeader, ModalFooter } from '@heroui/react';
import { Car, CreditCard, Wallet, QrCode } from 'lucide-react';
import axios from 'axios';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

export default function RidePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RidePageInner />
        </Suspense>
    );
}

function RidePageInner() {
    const mapContainer = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const params = useSearchParams();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const pickup = params.get('pickup');
    const drop = params.get('drop');
    const pickupLat = parseFloat(params.get('pickupLat') ?? '0');
    const pickupLng = parseFloat(params.get('pickupLng') ?? '0');
    const dropLat = parseFloat(params.get('dropLat') ?? '0');
    const dropLng = parseFloat(params.get('dropLng') ?? '0');

    useEffect(() => {
        if (!mapContainer.current) return;

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [pickupLng, pickupLat],
            zoom: 13,
        });
        mapRef.current = map;

        const pickupMarker = new mapboxgl.Marker({ color: 'green' })
            .setLngLat([pickupLng, pickupLat])
            .addTo(map);

        const dropMarker = new mapboxgl.Marker({ color: 'red' })
            .setLngLat([dropLng, dropLat])
            .addTo(map);

        const driverMarker = new mapboxgl.Marker({ color: 'blue' })
            .setLngLat([pickupLng + 0.01, pickupLat + 0.01]) // Simulated near pickup
            .addTo(map);

        const getRoute = async () => {
            const res = await axios.get(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?geometries=geojson&access_token=${mapboxgl.accessToken}`
            );
            const route = res.data.routes[0].geometry;

            map.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: route },
            });

            map.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                paint: { 'line-color': '#1E90FF', 'line-width': 4 },
            });
        };

        map.on('load', getRoute);

        return () => map.remove();
    }, []);

    return (
        <div className="relative h-screen w-full">
            {/* Map */}
            <div ref={mapContainer} className="absolute inset-0" />

            {/* Driver Details Card */}
            <div className="absolute bottom-0 w-full bg-white shadow-lg p-4 rounded-t-2xl">
                <Card className="w-full">
                    <CardBody className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Car className="text-blue-500" /> Your Driver
                            </h2>
                            <span className="text-gray-500 text-sm">Arriving Soon...</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-semibold">Rajesh Sharma</p>
                                <p className="text-sm text-gray-600">Maruti Swift - DL 09 AB 1234</p>
                            </div>
                            <div className="text-right">
                                <p className="font-medium">Pickup: <span className="text-gray-700">{pickup}</span></p>
                                <p className="font-medium">Drop: <span className="text-gray-700">{drop}</span></p>
                            </div>
                        </div>

                        <Button
                            color="primary"
                            className="w-full mt-2"
                            onPress={() => setIsModalOpen(true)}
                        >
                            Make Payment
                        </Button>
                    </CardBody>
                </Card>
            </div>

            {/* Payment Modal */}
            <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen} placement="bottom">
                <ModalContent>
                    <ModalHeader className="text-lg font-semibold">Select Payment Option</ModalHeader>
                    <ModalBody className="space-y-3">
                        <Button variant="flat" className="flex justify-between items-center">
                            <CreditCard /> Card Payment
                        </Button>
                        <Button variant="flat" className="flex justify-between items-center">
                            <Wallet /> UPI / Wallets
                        </Button>
                        <Button variant="flat" className="flex justify-between items-center">
                            <QrCode /> Cash / Pay on arrival
                        </Button>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="primary" onPress={() => setIsModalOpen(false)}>
                            Done
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
}

// 'use client';
// import { useEffect, useRef, useState } from 'react';
// import mapboxgl from 'mapbox-gl';
// import { Button } from '@heroui/react';

// mapboxgl.accessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';

// export default function RidePage() {
//   const mapContainer = useRef<HTMLDivElement | null>(null);
//   const mapRef = useRef<mapboxgl.Map | null>(null);

//   const [showPayment, setShowPayment] = useState(false);

//   // Get stored pickup/drop from previous page
//   const pickup = JSON.parse(localStorage.getItem('pickup') || '{}');
//   const drop = JSON.parse(localStorage.getItem('dropoff') || '{}');

//   // Mock driver near pickup
//   const driver = {
//     name: 'Rahul Sharma',
//     car: 'Toyota Innova',
//     number: 'DL 4C AE 1234',
//     location: {
//       lat: pickup.lat ? pickup.lat + 0.002 : 28.6139,
//       lng: pickup.lng ? pickup.lng + 0.002 : 77.2090,
//     },
//   };

//   useEffect(() => {
//     if (!mapContainer.current) return;

//     mapRef.current = new mapboxgl.Map({
//       container: mapContainer.current,
//       style: 'mapbox://styles/mapbox/streets-v11',
//       center: pickup.lat ? [pickup.lng, pickup.lat] : [77.2090, 28.6139],
//       zoom: 13,
//     });

//     const map = mapRef.current;

//     map.on('load', async () => {
//       // Add markers
//       new mapboxgl.Marker({ color: 'green' })
//         .setLngLat([pickup.lng, pickup.lat])
//         .setPopup(new mapboxgl.Popup().setText('Pickup'))
//         .addTo(map);

//       new mapboxgl.Marker({ color: 'red' })
//         .setLngLat([drop.lng, drop.lat])
//         .setPopup(new mapboxgl.Popup().setText('Drop-off'))
//         .addTo(map);

//       new mapboxgl.Marker({ color: 'blue' })
//         .setLngLat([driver.location.lng, driver.location.lat])
//         .setPopup(new mapboxgl.Popup().setText('Driver'))
//         .addTo(map);

//       // Get route
//       const routeURL = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
//       const response = await fetch(routeURL);
//       const data = await response.json();
//       const route = data.routes[0].geometry;

//       map.addSource('route', {
//         type: 'geojson',
//         data: {
//           type: 'Feature',
//           properties: {},
//           geometry: route,
//         },
//       });

//       map.addLayer({
//         id: 'route',
//         type: 'line',
//         source: 'route',
//         layout: { 'line-join': 'round', 'line-cap': 'round' },
//         paint: { 'line-color': '#1DB954', 'line-width': 4 },
//       });

//       const bounds = new mapboxgl.LngLatBounds();
//       [pickup, drop, driver.location].forEach(loc =>
//         bounds.extend([loc.lng, loc.lat])
//       );
//       map.fitBounds(bounds, { padding: 50 });
//     });

//     return () => map.remove();
//   }, []);

//   return (
//     <div className="relative w-full h-screen">
//       {/* Map */}
//       <div ref={mapContainer} className="w-full h-full" />

//       {/* Driver details overlay */}
//       <div className="absolute bottom-28 left-1/2 transform -translate-x-1/2 w-[90%] bg-white p-4 rounded-2xl shadow-lg text-center">
//         <h2 className="text-xl font-semibold text-gray-800">Your Driver</h2>
//         <p className="text-gray-600 mt-1">{driver.name}</p>
//         <p className="text-gray-600">{driver.car}</p>
//         <p className="text-gray-600 mb-3">{driver.number}</p>
//         <Button
//           color="success"
//           className="w-full font-medium"
//           onPress={() => setShowPayment(true)}
//         >
//           Make Payment
//         </Button>
//       </div>

//       {/* Payment Modal */}
//       {showPayment && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-end">
//           <div className="bg-white w-full sm:w-[400px] p-6 rounded-t-3xl shadow-xl">
//             <h3 className="text-lg font-semibold mb-3 text-center">
//               Choose Payment Method
//             </h3>
//             <div className="space-y-3">
//               {['UPI', 'Credit Card', 'Cash', 'Wallet'].map(method => (
//                 <Button
//                   key={method}
//                   variant="flat"
//                   className="w-full border font-medium"
//                   onPress={() => {
//                     alert(`Payment via ${method} successful!`);
//                     setShowPayment(false);
//                   }}
//                 >
//                   {method}
//                 </Button>
//               ))}
//             </div>
//             <Button
//               color="danger"
//               className="w-full mt-4"
//               onPress={() => setShowPayment(false)}
//             >
//               Cancel
//             </Button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
