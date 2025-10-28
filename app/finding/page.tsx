// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { Card, CardBody, Spinner, Button } from '@heroui/react';
// import { motion } from 'framer-motion';
// import { Car, MapPin, Timer } from 'lucide-react';

// export default function FindingPage() {
//   const router = useRouter();
//   const [timeLeft, setTimeLeft] = useState(10);

//   useEffect(() => {
//     const timer = setInterval(() => {
//       setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
//     }, 1000);

//     return () => clearInterval(timer);
//   }, []);

//   // Simulate driver found after delay
//   useEffect(() => {
//     if (timeLeft === 0) {
//       router.push('/ride'); 
//     }
//   }, [timeLeft, router]);

//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
//       <Card className="w-full max-w-md shadow-xl">
//         <CardBody className="flex flex-col items-center gap-6 text-center py-10">
//           <motion.div
//             animate={{ rotate: 360 }}
//             transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
//           >
//             <Spinner size="lg" color="primary" />
//           </motion.div>

//           <h1 className="text-2xl font-semibold text-gray-800">
//             Finding your driver...
//           </h1>

//           <div className="flex flex-col gap-3 text-gray-600 text-base">
//             <div className="flex items-center justify-center gap-2">
//               <Car className="text-primary" /> <span>Searching nearby drivers</span>
//             </div>
//             <div className="flex items-center justify-center gap-2">
//               <MapPin className="text-green-500" /> <span>Optimizing pickup route</span>
//             </div>
//             <div className="flex items-center justify-center gap-2">
//               <Timer className="text-orange-500" /> <span>{timeLeft}s remaining</span>
//             </div>
//           </div>

//           <Button
//             color="danger"
//             variant="light"
//             onPress={() => router.push('/booking')}
//           >
//             Cancel Ride
//           </Button>
//         </CardBody>
//       </Card>
//     </div>
//   );
// }


'use client';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardBody, Spinner, Button } from '@heroui/react';
import { motion } from 'framer-motion';
import { Car, MapPin, Timer } from 'lucide-react';

export default function FindingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FindingPageInner />
    </Suspense>
  );
}


function FindingPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [timeLeft, setTimeLeft] = useState(10);

  // Extract booking details
  const pickup = params.get('pickup');
  const drop = params.get('drop');
  const pickupLat = params.get('pickupLat');
  const pickupLng = params.get('pickupLng');
  const dropLat = params.get('dropLat');
  const dropLng = params.get('dropLng');
  const type = params.get('type');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      const query = new URLSearchParams({
        pickup: pickup ?? '',
        drop: drop ?? '',
        pickupLat: pickupLat ?? '',
        pickupLng: pickupLng ?? '',
        dropLat: dropLat ?? '',
        dropLng: dropLng ?? '',
        type: type ?? '',
      });
      router.push(`/ride?${query.toString()}`);
    }
  }, [timeLeft]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardBody className="flex flex-col items-center gap-6 text-center py-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          >
            <Spinner size="lg" color="primary" />
          </motion.div>

          <h1 className="text-2xl font-semibold text-gray-800">
            Finding your driver...
          </h1>

          <div className="flex flex-col gap-3 text-gray-600 text-base">
            <div className="flex items-center justify-center gap-2">
              <Car className="text-primary" /> <span>Searching nearby drivers</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <MapPin className="text-green-500" /> <span>Optimizing pickup route</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Timer className="text-orange-500" /> <span>{timeLeft}s remaining</span>
            </div>
          </div>

          <Button
            color="danger"
            variant="light"
            onPress={() => router.push('/booking')}
          >
            Cancel Ride
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
