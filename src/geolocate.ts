export async function getCurrentPosition(): Promise<{lat:number; lng:number; accuracy:number;}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("Geolocation not supported by this browser"));
    }

    // Enhanced geolocation options for maximum accuracy
    const options: PositionOptions = {
      enableHighAccuracy: true,    // Use GPS if available
      timeout: 30000,              // Increased timeout for better accuracy
      maximumAge: 0                // No cached positions - always get fresh reading
    };

    console.log('🎯 Getting high-accuracy location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        console.log('📍 Location acquired:');
        console.log(`- Latitude: ${latitude}`);
        console.log(`- Longitude: ${longitude}`);
        console.log(`- Accuracy: ${accuracy} meters`);
        console.log(`- Timestamp: ${new Date(position.timestamp).toISOString()}`);
        
        // Log additional available data if present
        if (position.coords.altitude !== null) {
          console.log(`- Altitude: ${position.coords.altitude} meters`);
        }
        if (position.coords.heading !== null) {
          console.log(`- Heading: ${position.coords.heading} degrees`);
        }
        if (position.coords.speed !== null) {
          console.log(`- Speed: ${position.coords.speed} m/s`);
        }
        
        resolve({ 
          lat: latitude, 
          lng: longitude, 
          accuracy: accuracy || 999 // Fallback if accuracy is null
        });
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        
        let errorMessage: string;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location services and refresh the page.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please check your GPS/network connection.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
          default:
            errorMessage = `Geolocation error: ${error.message}`;
            break;
        }
        
        reject(new Error(errorMessage));
      },
      options
    );
  });
}

// Enhanced function that can try multiple times for better accuracy
export async function getHighAccuracyPosition(): Promise<{lat:number; lng:number; accuracy:number;}> {
  const maxAttempts = 3;
  const acceptableAccuracy = 10; // meters
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🎯 Attempt ${attempt}/${maxAttempts} for high-accuracy location...`);
      
      const position = await getCurrentPosition();
      
      if (position.accuracy <= acceptableAccuracy) {
        console.log(`✅ Achieved desired accuracy: ${position.accuracy}m`);
        return position;
      }
      
      if (attempt < maxAttempts) {
        console.log(`⏳ Accuracy ${position.accuracy}m not ideal, trying again...`);
        // Wait 2 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log(`📍 Using best available accuracy: ${position.accuracy}m`);
        return position;
      }
      
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      console.log(`⚠️ Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  throw new Error("Failed to get location after multiple attempts");
}
