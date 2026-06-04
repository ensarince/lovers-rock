import * as Location from 'expo-location';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';

const POCKETBASE_URL = getPocketBaseUrl();

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
      if (__DEV__) console.error('📍 Location permission error:', error);
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
      });

      return location;
    } catch (error) {
      // Try with reduced accuracy as fallback
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
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
      const roundCoord = (value: number, decimals = 3) => {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
      };

      const safeLatitude = roundCoord(latitude);
      const safeLongitude = roundCoord(longitude);

      const response = await fetch(
        `${POCKETBASE_URL}/api/collections/users/records/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: safeLatitude,
            longitude: safeLongitude,
            last_location_update: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (__DEV__) console.error(`📍 Location update failed: ${response.status}`, errorText);
        return false;
      }

      return true;
    } catch (error) {
      if (__DEV__) console.error('📍 Location update error:', error);
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

    const success = await this.updateUserLocation(
      userId,
      token,
      location.coords.latitude,
      location.coords.longitude
    );
    if (success) {
      if (__DEV__) console.log('✅ Location saved to database');
    } else {
      if (__DEV__) console.log('❌ Failed to save location');
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
