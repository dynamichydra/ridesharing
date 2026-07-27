import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/constants/constants.dart';
import '../../models/location_model.dart';
import '../../services/geocoding_service.dart';
import '../../services/location_service.dart';

typedef OnLocationChanged = void Function(LocationModel location);
typedef OnLocationConfirmed = void Function(LocationModel location);

class GoogleMapPicker extends StatefulWidget {
  final LatLng initialPosition;
  final double initialZoom;
  final OnLocationChanged? onLocationChanged;
  final OnLocationConfirmed? onLocationConfirmed;
  final String confirmButtonText;
  final Widget? customMarkerWidget;
  final bool showConfirmButton;
  final bool showMyLocationButton;
  final LocationService? locationService;
  final GeocodingService? geocodingService;

  final String? mapStyle;
  final String? cloudMapId;

  const GoogleMapPicker({
    super.key,
    this.initialPosition = const LatLng(37.7749, -122.4194), // Default San Francisco
    this.initialZoom = 15.0,
    this.onLocationChanged,
    this.onLocationConfirmed,
    this.confirmButtonText = 'Confirm Location',
    this.customMarkerWidget,
    this.showConfirmButton = true,
    this.showMyLocationButton = true,
    this.mapStyle,
    this.cloudMapId,
    this.locationService,
    this.geocodingService,
  });

  @override
  State<GoogleMapPicker> createState() => _GoogleMapPickerState();
}

class _GoogleMapPickerState extends State<GoogleMapPicker> {
  GoogleMapController? _mapController;
  late final LocationService _locationService;
  late final GeocodingService _geocodingService;

  LatLng? _currentCameraPosition;
  LocationModel? _resolvedLocation;
  bool _isGeocoding = false;
  bool _isLoadingCurrentLocation = false;
  bool _hasLocationPermission = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _locationService = widget.locationService ?? LocationService();
    _geocodingService = widget.geocodingService ?? GeocodingService();
    _currentCameraPosition = widget.initialPosition;

    // Check permissions and attempt initial current location fetch
    _initializeLocation();
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _initializeLocation() async {
    final result = await _locationService.checkAndRequestPermission();
    if (mounted) {
      setState(() {
        _hasLocationPermission = result.isGranted;
        if (!result.isGranted && result.errorMessage != null) {
          _errorMessage = result.errorMessage;
        }
      });
    }

    if (result.isGranted) {
      await _moveToCurrentLocation();
    } else {
      // If permission is not granted, geocode the initial position
      _handleCameraIdle();
    }
  }

  Future<void> _moveToCurrentLocation() async {
    if (_isLoadingCurrentLocation) return;

    setState(() {
      _isLoadingCurrentLocation = true;
      _errorMessage = null;
    });

    try {
      final LatLng? currentLocation = await _locationService.getCurrentLocation();
      if (currentLocation != null && mounted) {
        _currentCameraPosition = currentLocation;
        if (_mapController != null) {
          await _mapController!.animateCamera(
            CameraUpdate.newLatLngZoom(currentLocation, widget.initialZoom),
          );
        } else {
          _handleCameraIdle();
        }
      } else if (mounted) {
        setState(() {
          _errorMessage = 'Unable to fetch current location. Using fallback location.';
        });
        _handleCameraIdle();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Location error occurred.';
        });
        _handleCameraIdle();
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingCurrentLocation = false;
        });
      }
    }
  }

  void _onCameraMove(CameraPosition position) {
    // Requirements: Store ONLY the latest LatLng. Do NOT perform reverse geocoding here.
    _currentCameraPosition = position.target;
  }

  Future<void> _handleCameraIdle() async {
    if (_currentCameraPosition == null) return;

    final LatLng target = _currentCameraPosition!;

    if (mounted) {
      setState(() {
        _isGeocoding = true;
      });
    }

    try {
      final LocationModel? location = await _geocodingService.reverseGeocode(target);
      if (location != null && mounted) {
        setState(() {
          _resolvedLocation = location;
          _isGeocoding = false;
        });
        widget.onLocationChanged?.call(location);
      }
    } catch (_) {
      if (mounted) {
        final fallback = LocationModel(
          latitude: target.latitude,
          longitude: target.longitude,
          formattedAddress:
              '${target.latitude.toStringAsFixed(6)}, ${target.longitude.toStringAsFixed(6)}',
        );
        setState(() {
          _resolvedLocation = fallback;
          _isGeocoding = false;
        });
        widget.onLocationChanged?.call(fallback);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Embedded Google Map using Google Cloud Map ID
        GoogleMap(
          // Applied Google Cloud Map ID (Android: fff6d11d7fdc289b41602fe8, iOS: fff6d11d7fdc289b1acc6a66)
          mapId: widget.cloudMapId ?? AppConstants.cloudMapId,
          style: widget.mapStyle,
          initialCameraPosition: CameraPosition(
            target: widget.initialPosition,
            zoom: widget.initialZoom,
          ),
          onMapCreated: (GoogleMapController controller) {
            _mapController = controller;
          },
          onCameraMove: _onCameraMove,
          onCameraIdle: _handleCameraIdle,
          myLocationEnabled: _hasLocationPermission,
          myLocationButtonEnabled: false, // Custom button used for better layout control
          zoomGesturesEnabled: true,
          rotateGesturesEnabled: true,
          tiltGesturesEnabled: true,
          compassEnabled: true,
          mapToolbarEnabled: false,
          zoomControlsEnabled: false,
        ),

        // Uber/Ola Style Fixed Center Pin Marker Overlay
        Center(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 36.0),
            child: widget.customMarkerWidget ??
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.8),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _isGeocoding
                            ? 'Locating...'
                            : _resolvedLocation?.street ??
                                _resolvedLocation?.locality ??
                                'Set pickup point',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Icon(
                      Icons.location_on,
                      size: 40,
                      color: Theme.of(context).primaryColor != Colors.transparent
                          ? Theme.of(context).primaryColor
                          : Colors.redAccent,
                    ),
                  ],
                ),
          ),
        ),

        // Floating Action Buttons & Address Card
        Positioned(
          left: 16,
          right: 16,
          bottom: 24,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Error banner if any
              if (_errorMessage != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade100,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade400),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.warning_amber_rounded, size: 18, color: Colors.amber.shade900),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(fontSize: 12, color: Colors.amber.shade900),
                        ),
                      ),
                    ],
                  ),
                ),

              // My Location Button
              if (widget.showMyLocationButton)
                FloatingActionButton.small(
                  heroTag: 'my_location_btn',
                  onPressed: _moveToCurrentLocation,
                  backgroundColor: Colors.white,
                  child: _isLoadingCurrentLocation
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.my_location, color: Colors.black87),
                ),
              const SizedBox(height: 12),

              // Address Details Card & Confirmation Button
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 10,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.place, color: Colors.redAccent, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _isGeocoding
                                ? 'Fetching address...'
                                : (_resolvedLocation?.formattedAddress ?? 'Unknown Location'),
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.black87,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    if (widget.showConfirmButton && _resolvedLocation != null) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton(
                          onPressed: _isGeocoding
                              ? null
                              : () {
                                  if (_resolvedLocation != null) {
                                    widget.onLocationConfirmed?.call(_resolvedLocation!);
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Text(widget.confirmButtonText),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
