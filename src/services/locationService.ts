import * as Location from 'expo-location';

const POCKETBASE_URL = `http://${process.env.EXPO_PUBLIC_IP}:8090`;

class LocationService {
  private locationUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private hasLocationPermission: boolean = false;

  /**
   * Request location permissions once at app start
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.hasLocationPermission = status === 'granted';
      return this.hasLocationPermission;
    } catch (error) {
      console.error('📍 Location permission error:', error);
      return false;
    }
  }

  /**
   * Get current location (assumes permission already granted)
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      if (!this.hasLocationPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeoutMs: 10000, // 10 second timeout
      });

      return location;
    } catch (error) {
      // Try with reduced accuracy as fallback
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
          timeoutMs: 5000, // 5 second timeout
        });
        return location;
      } catch (fallbackError) {
        console.warn('📍 Location unavailable, will retry on next update');
        return null;
      }
    }
  }

  /**
   * Update user location in PocketBase
   */
  async updateUserLocation(
    userId: string,
    token: string,
    latitude: number,
    longitude: number
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude,
            longitude,
            last_location_update: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`📍 Location update failed: ${response.status}`, errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('📍 Location update error:', error);
      return false;
    }
  }

  /**
   * Get current location and update in PocketBase
   */
  async getCurrentLocationAndUpdate(
    userId: string,
    token: string
  ): Promise<boolean> {
    const location = await this.getCurrentLocation();
    if (!location) {
      return false;
    }

    console.log(`📍 Saving location: ${location.coords.latitude}, ${location.coords.longitude}`);
    const success = await this.updateUserLocation(
      userId,
      token,
      location.coords.latitude,
      location.coords.longitude
    );
    if (success) {
      console.log('✅ Location saved to database');
    } else {
      console.log('❌ Failed to save location');
    }
    return success;
  }

  /**
   * Start periodic location updates (every 5 minutes)
   */
  async startPeriodicLocationUpdates(
    userId: string,
    token: string,
    intervalMinutes: number = 5
  ): Promise<void> {
    // Request permission first if not already granted
    if (!this.hasLocationPermission) {
      const granted = await this.requestLocationPermission();
      if (!granted) {
        return;
      }
    }

    // Update immediately on start
    await this.getCurrentLocationAndUpdate(userId, token);

    // Then update periodically
    this.locationUpdateInterval = setInterval(async () => {
      await this.getCurrentLocationAndUpdate(userId, token);
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic location updates
   */
  stopPeriodicLocationUpdates(): void {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
  }
}

export const locationService = new LocationService();
