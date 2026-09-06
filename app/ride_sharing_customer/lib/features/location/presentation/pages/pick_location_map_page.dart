import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../services/geocoding_service.dart';
import '../../services/location_service.dart';
import '../../../../core/widgets/loading_view.dart';

class PickLocationMapPage extends StatefulWidget {
  const PickLocationMapPage({super.key});

  @override
  State<PickLocationMapPage> createState() => _PickLocationMapPageState();
}

class _PickLocationMapPageState extends State<PickLocationMapPage> {
  final LocationService _locationService = LocationService();
  final GeocodingService _geocodingService = GeocodingService();

  GoogleMapController? _mapController;
  LatLng? _currentCenter;
  String _currentAddress = 'Loading address...';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initMap();
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  Future<void> _initMap() async {
    final loc = await _locationService.getCurrentLocation();
    setState(() {
      _currentCenter = loc ?? const LatLng(22.5726, 88.3639);
      _isLoading = false;
    });
    _updateAddress(_currentCenter!);
  }

  Future<void> _updateAddress(LatLng location) async {
    setState(() => _currentAddress = 'Resolving address...');
    try {
      final model = await _geocodingService.reverseGeocode(location);
      if (mounted) {
        setState(() {
          _currentAddress = model?.formattedAddress ??
              '${location.latitude.toStringAsFixed(5)}, ${location.longitude.toStringAsFixed(5)}';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _currentAddress =
            '${location.latitude.toStringAsFixed(5)}, ${location.longitude.toStringAsFixed(5)}');
      }
    }
  }

  void _onCameraMove(CameraPosition position) {
    _currentCenter = position.target;
  }

  void _onCameraIdle() {
    if (_currentCenter != null) {
      _updateAddress(_currentCenter!);
    }
  }

  void _onConfirm() {
    if (_currentCenter != null) {
      context.pop({
        'latitude': _currentCenter!.latitude,
        'longitude': _currentCenter!.longitude,
        'address': _currentAddress,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading || _currentCenter == null) {
      return const Scaffold(body: LoadingView());
    }

    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(
              target: _currentCenter!,
              zoom: 16.0,
            ),
            mapId: AppConstants.cloudMapId,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            onMapCreated: (controller) => _mapController = controller,
            onCameraMove: _onCameraMove,
            onCameraIdle: _onCameraIdle,
          ),
          // Center Pin
          const Center(
            child: Padding(
              padding: EdgeInsets.only(bottom: 36),
              child: Icon(
                Icons.location_on,
                size: 44,
                color: Color(0xFF009048),
              ),
            ),
          ),
          // Back Button
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87),
                onPressed: () => context.pop(),
              ),
            ),
          ),
          // My Location Button
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            right: 16,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: IconButton(
                icon: const Icon(Icons.my_location_rounded, color: Color(0xFF009048)),
                onPressed: () async {
                  final loc = await _locationService.getCurrentLocation();
                  if (loc != null && _mapController != null) {
                    _mapController!.animateCamera(CameraUpdate.newLatLng(loc));
                  }
                },
              ),
            ),
          ),
          // Bottom Info Sheet
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                boxShadow: [
                  BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, -4)),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Selected Location',
                    style: TextStyle(color: Colors.grey, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _currentAddress,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      onPressed: _onConfirm,
                      child: const Text('Confirm Location',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  SizedBox(height: MediaQuery.of(context).padding.bottom),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

