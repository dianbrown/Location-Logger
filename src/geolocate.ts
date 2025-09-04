export async function getCurrentPosition(): Promise<{lat:number; lng:number; accuracy:number;}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        resolve({ lat: latitude, lng: longitude, accuracy });
      },
      err => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
