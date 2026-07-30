import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/models/route_model.dart';
import '../../../../core/services/google_routes_service.dart';
import '../../../../core/widgets/app_map_view.dart';
import '../../../location/location.dart';
import '../bloc/booking_bloc.dart';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

enum LocationTarget { pickup, destination }

enum SelectionStep {
  initialSearch,  // Step 1: Opening page — no selection yet
  pickupSelected, // Step 2: Pickup confirmed
  destSelected    // Step 3: Destination confirmed — route drawn
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

class SelectLocationPage extends StatefulWidget {
  const SelectLocationPage({super.key});

  @override
  State<SelectLocationPage> createState() => _SelectLocationPageState();
}

class _SelectLocationPageState extends State<SelectLocationPage> with SingleTickerProviderStateMixin {
  late AnimationController _rotationController;

  // ---- Text controllers & focus nodes ----
  final TextEditingController _pickupController =
      TextEditingController(text: 'Locating...');
  final TextEditingController _destinationController =
      TextEditingController();
  final FocusNode _pickupFocusNode = FocusNode();
  final FocusNode _destinationFocusNode = FocusNode();

  // ---- Services ----
  final PlacesService _placesService = PlacesService();
  final GeocodingService _geocodingService = GeocodingService();
  final GoogleRoutesService _routesService = GoogleRoutesService();

  // ---- Map controller ----
  GoogleMapController? _mapController;

  // ---- Flow state ----
  SelectionStep _currentStep = SelectionStep.initialSearch;
  LocationTarget _activeInputTarget = LocationTarget.destination;

  // ---- Location state ----
  LatLng _pickupLatLng = const LatLng(22.5726, 88.3639); // Kolkata fallback
  LatLng _destLatLng = const LatLng(22.5552, 88.3519);
  String _pickupName = 'Fetching current location...';
  String _pickupAddress = 'Loading address details...';
  String _destName = 'Destination';
  String _destAddress = 'Choose destination';
  bool _isLoadingLocation = true;

  // ---- Autocomplete state ----
  bool _isSearching = false;
  List<Map<String, dynamic>> _searchResults = [];
  bool _showAutocomplete = false;

  // ---- Route state ----
  RouteModel? _currentRoute;
  bool _isLoadingRoute = false;





  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _placesService.initialize(AppConstants.googleMapsApiKey);
    _initCurrentLocation();


    _pickupFocusNode.addListener(() {
      if (_pickupFocusNode.hasFocus) {
        setState(() {
          _activeInputTarget = LocationTarget.pickup;
          _showAutocomplete = true;
        });
      } else {
        setState(() => _showAutocomplete = _destinationFocusNode.hasFocus);
      }
    });

    _destinationFocusNode.addListener(() {
      if (_destinationFocusNode.hasFocus) {
        setState(() {
          _activeInputTarget = LocationTarget.destination;
          _showAutocomplete = true;
        });
      } else {
        setState(() => _showAutocomplete = _pickupFocusNode.hasFocus);
      }
    });
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _destinationController.dispose();
    _pickupFocusNode.dispose();
    _destinationFocusNode.dispose();
    _mapController?.dispose();
    _rotationController.dispose();
    super.dispose();
  }


  // ---------------------------------------------------------------------------
  // GPS
  // ---------------------------------------------------------------------------

  Future<void> _initCurrentLocation() async {
    try {
      final locationService = LocationService();
      final currentLoc = await locationService.getCurrentLocation();
      if (currentLoc != null && mounted) {
        final place = await _geocodingService.reverseGeocode(currentLoc);
        final placeName = _extractPlaceName(place, fallback: 'Current Location');
        final placeAddress = place?.formattedAddress ?? '';
        setState(() {
          _pickupLatLng = currentLoc;
          _pickupName = placeName;
          _pickupAddress = placeAddress;
          _pickupController.text = placeName;
          _isLoadingLocation = false;
        });
      } else if (mounted) {
        setState(() {
          _pickupName = 'Current Location';
          _pickupAddress = 'Resolved location';
          _pickupController.text = 'Current Location';
          _isLoadingLocation = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _pickupName = 'Current Location';
          _pickupAddress = 'Resolved location';
          _pickupController.text = 'Current Location';
          _isLoadingLocation = false;
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Map
  // ---------------------------------------------------------------------------

  void _onMapControllerCreated(GoogleMapController controller) {
    _mapController = controller;
  }

  Future<void> _onMapTapped(LatLng position) async {
    _pickupFocusNode.unfocus();
    _destinationFocusNode.unfocus();

    final place = await _geocodingService.reverseGeocode(position);
    final placeName = _extractPlaceName(place, fallback: 'Pinned Location');
    final placeAddress = place?.formattedAddress ?? '';

    if (_activeInputTarget == LocationTarget.pickup) {
      setState(() {
        _pickupLatLng = position;
        _pickupName = placeName;
        _pickupAddress = placeAddress;
        _pickupController.text = placeName;
        _currentStep = SelectionStep.pickupSelected;
        _currentRoute = null;
        _searchResults = [];
        _showAutocomplete = false;
      });
    } else {
      setState(() {
        _destLatLng = position;
        _destName = placeName;
        _destAddress = placeAddress;
        _destinationController.text = placeName;
        _currentStep = SelectionStep.destSelected;
        _searchResults = [];
        _showAutocomplete = false;
      });
      await _fetchRoute();
    }
  }

  // ---------------------------------------------------------------------------
  // Route
  // ---------------------------------------------------------------------------

  Future<void> _fetchRoute() async {
    if (_currentStep != SelectionStep.destSelected) return;

    setState(() {
      _isLoadingRoute = true;
      _currentRoute = null;
    });

    final route = await _routesService.computeRoute(
      _pickupLatLng,
      _destLatLng,
      travelMode: AppTravelMode.drive,
    );

    if (!mounted) return;

    setState(() {
      _currentRoute = route;
      _isLoadingRoute = false;
    });

    if (route != null && route.bounds != null && _mapController != null) {
      await Future.delayed(const Duration(milliseconds: 300));
      if (mounted && _mapController != null) {
        _mapController!.animateCamera(
          CameraUpdate.newLatLngBounds(route.bounds!, 80),
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Swap pickup ↔ destination
  // ---------------------------------------------------------------------------

  Future<void> _swapLocations() async {
    if (_pickupName.isEmpty) return;

    final tmpLatLng = _pickupLatLng;
    final tmpName = _pickupName;
    final tmpAddress = _pickupAddress;

    // Trigger 180 degree rotation animation
    if (_rotationController.status == AnimationStatus.completed) {
      _rotationController.reverse();
    } else {
      _rotationController.forward();
    }

    setState(() {
      _pickupLatLng = _destLatLng;
      _pickupName = _destName;
      _pickupAddress = _destAddress;
      _pickupController.text = _destName;

      _destLatLng = tmpLatLng;
      _destName = tmpName;
      _destAddress = tmpAddress;
      _destinationController.text = tmpName;

      _currentRoute = null;
      _currentStep = SelectionStep.destSelected;
    });

    await _fetchRoute();
  }


  // ---------------------------------------------------------------------------
  // Autocomplete search
  // ---------------------------------------------------------------------------

  Future<void> _onSearchQueryChanged(String query, LocationTarget target) async {
    if (_activeInputTarget != target) {
      setState(() => _activeInputTarget = target);
    }

    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
        _showAutocomplete = true;
      });
      return;
    }

    setState(() {
      _isSearching = true;
      _showAutocomplete = true;
    });

    try {
      final predictions = await _placesService.fetchPredictions(query);
      if (predictions.isNotEmpty) {
        final mapped = predictions.map((pred) => {
          'name': pred.primaryText,
          'address': pred.fullText,
          'placeId': pred.placeId,
          'type': 'place',
        }).toList();

        if (mounted) {
          setState(() {
            _searchResults = mapped;
            _isSearching = false;
          });
        }
      } else {
        final coord = await _geocodingService.forwardGeocode(query);
        if (coord != null && mounted) {
          String displayAddress = query;
          try {
            final reversedPlace =
                await _geocodingService.reverseGeocode(coord);
            final resolved =
                _extractPlaceName(reversedPlace, fallback: query);
            if (resolved.isNotEmpty) displayAddress = resolved;
          } catch (_) {}

          if (mounted) {
            setState(() {
              _searchResults = [
                {
                  'name': query,
                  'address': displayAddress,
                  'latitude': coord.latitude,
                  'longitude': coord.longitude,
                  'type': 'geocode',
                }
              ];
              _isSearching = false;
            });
          }
        } else if (mounted) {
          setState(() => _isSearching = false);
        }
      }
    } catch (_) {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  Future<void> _onSelectLocationItem(Map<String, dynamic> place) async {
    final String name = (place['name'] as String?) ?? 'Selected Location';
    final String address = (place['address'] as String?) ?? name;

    LatLng coords;
    if (place['latitude'] != null && place['longitude'] != null) {
      coords = LatLng(place['latitude'] as double, place['longitude'] as double);
    } else if (place['placeId'] != null) {
      coords = (await _placesService.getLatLngFromPlaceId(place['placeId'] as String)) ??
          LatLng(_pickupLatLng.latitude + 0.015, _pickupLatLng.longitude + 0.015);
    } else {
      coords = (await _geocodingService.forwardGeocode('$name $address')) ??
          LatLng(_pickupLatLng.latitude + 0.015, _pickupLatLng.longitude + 0.015);
    }

    _pickupFocusNode.unfocus();
    _destinationFocusNode.unfocus();

    if (_activeInputTarget == LocationTarget.pickup) {
      setState(() {
        _pickupLatLng = coords;
        _pickupName = name;
        _pickupAddress = address;
        _pickupController.text = name;
        _currentStep = SelectionStep.pickupSelected;
        _searchResults = [];
        _showAutocomplete = false;
        _currentRoute = null;
      });
      if (_mapController != null) {
        await Future.delayed(const Duration(milliseconds: 200));
        if (mounted && _mapController != null) {
          _mapController!.animateCamera(
            CameraUpdate.newCameraPosition(
              CameraPosition(target: coords, zoom: 15.5),
            ),
          );
        }
      }
    } else {
      setState(() {
        _destLatLng = coords;
        _destName = name;
        _destAddress = address;
        _destinationController.text = name;
        _currentStep = SelectionStep.destSelected;
        _searchResults = [];
        _showAutocomplete = false;
      });
      await _fetchRoute();
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  void _proceedToRideOptions() {
    context.read<BookingBloc>().add(
          SetRideLocations(
            pickup: _pickupLatLng,
            pickupName: _pickupName,
            pickupAddress: _pickupAddress,
            destination: _destLatLng,
            destinationName: _destName,
            destinationAddress: _destAddress,
          ),
        );
    context.pushReplacement('/ride-options');
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  String _extractPlaceName(dynamic place, {required String fallback}) {
    if (place == null) return fallback;
    final parts = <String>[];
    if (place.street != null && (place.street as String).isNotEmpty) {
      parts.add(place.street as String);
    }
    if (place.locality != null &&
        (place.locality as String).isNotEmpty &&
        place.locality != place.street) {
      parts.add(place.locality as String);
    }
    if (place.city != null &&
        (place.city as String).isNotEmpty &&
        place.city != place.locality) {
      parts.add(place.city as String);
    }
    if (parts.isNotEmpty) return parts.take(2).join(', ');
    final addr = place.formattedAddress as String?;
    if (addr != null && addr.isNotEmpty) return addr;
    return fallback;
  }

  // ---------------------------------------------------------------------------
  // Bottom sheets
  // ---------------------------------------------------------------------------

  Widget _buildDynamicBottomSheet(BuildContext context) {
    if (_currentStep == SelectionStep.pickupSelected) {
      return _buildPickupSheet();
    }
    if (_currentStep == SelectionStep.destSelected) {
      return _buildDestinationSheet();
    }
    return _buildInitialSheet();
  }

  Widget _buildPickupSheet() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2.0),
                child: Text('📍', style: TextStyle(fontSize: 20)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _pickupName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _pickupAddress,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed: () {
                setState(() => _currentStep = SelectionStep.destSelected);
                _fetchRoute();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF009048),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: const Text('Confirm pickup',
                  style:
                      TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDestinationSheet() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, -6),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 36, height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2.0),
                child: Text('📍', style: TextStyle(fontSize: 20)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _destName,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _destAddress,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          SizedBox(

            width: double.infinity,
            height: 54,
            child: ElevatedButton(
              onPressed: _isLoadingRoute ? null : _proceedToRideOptions,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF009048),
                disabledBackgroundColor: Colors.grey.shade300,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: _isLoadingRoute
                  ? const SizedBox(
                      width: 22, height: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2.5, color: Colors.white))
                  : const Text('Confirm destination',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInitialSheet() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: const Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.search_rounded, size: 20, color: Color(0xFF009048)),
              SizedBox(width: 10),
              Text(
                'Search destination',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          SizedBox(height: 10),
          Text(
            'Type your destination in the search box above, or tap anywhere on the map to set a location pin.',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF64748B),
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }


  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final routePoints = _currentRoute?.decodedPoints ?? const <LatLng>[];

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // ── 1. Full-screen Map ─────────────────────────────────────────────
          Positioned.fill(
            child: _isLoadingLocation
                ? const _MapLoadingPlaceholder()
                : AppMapView(
                    key: const ValueKey('main_map'),
                    onMapCreated: _onMapControllerCreated,
                    onTap: _onMapTapped,
                    pickup: _pickupLatLng,
                    destination: _currentStep == SelectionStep.destSelected
                        ? _destLatLng
                        : null,
                    driverPosition: _currentStep == SelectionStep.pickupSelected
                        ? _pickupLatLng
                        : null,
                    routePoints: routePoints,
                  ),
          ),

          // ── 2. Route loading chip ──────────────────────────────────────────
          if (_isLoadingRoute)
            const Positioned(
              bottom: 180,
              left: 0,
              right: 0,
              child: Center(child: _RouteLoadingChip()),
            ),

          // ── 3. Top header: back + dual input card ──────────────────────────
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            right: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Back button
                GestureDetector(
                  onTap: () {
                    if (_showAutocomplete) {
                      _pickupFocusNode.unfocus();
                      _destinationFocusNode.unfocus();
                      setState(() {
                        _showAutocomplete = false;
                        _searchResults = [];
                      });
                    } else if (_currentStep == SelectionStep.destSelected) {
                      setState(() {
                        _currentStep = SelectionStep.pickupSelected;
                        _currentRoute = null;
                      });
                    } else if (_currentStep == SelectionStep.pickupSelected) {
                      setState(() => _currentStep = SelectionStep.initialSearch);
                    } else {
                      context.pop();
                    }
                  },
                  child: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.12),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.arrow_back,
                        color: Color(0xFF0F172A), size: 20),
                  ),
                ),
                const SizedBox(height: 12),

                // Dual input card
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 18, vertical: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Route node graphic
                      Column(
                        children: [
                          Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: const Color(0xFF009048), width: 3),
                              color: _currentStep == SelectionStep.destSelected
                                  ? const Color(0xFF009048)
                                  : Colors.white,
                            ),
                          ),
                          Container(
                            height: 28,
                            width: 2,
                            margin: const EdgeInsets.symmetric(vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade300,
                              borderRadius: BorderRadius.circular(1),
                            ),
                          ),
                          Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                  color: const Color(0xFFE11D48), width: 3),
                              color: _currentStep == SelectionStep.destSelected
                                  ? const Color(0xFFE11D48)
                                  : Colors.white,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 14),

                      // Input fields
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // ── PICKUP TextField ──
                            TextField(
                              controller: _pickupController,
                              focusNode: _pickupFocusNode,
                              cursorColor: const Color(0xFF009048),
                              onTap: () => setState(() {
                                _activeInputTarget = LocationTarget.pickup;
                                _showAutocomplete = true;
                              }),
                              onChanged: (val) =>
                                  _onSearchQueryChanged(val, LocationTarget.pickup),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: _activeInputTarget == LocationTarget.pickup
                                    ? const Color(0xFF009048)
                                    : const Color(0xFF0F172A),
                              ),
                              decoration: InputDecoration(
                                labelText: 'Pickup location',
                                labelStyle: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: _activeInputTarget == LocationTarget.pickup
                                      ? const Color(0xFF009048)
                                      : const Color(0xFF64748B),
                                ),
                                floatingLabelBehavior: FloatingLabelBehavior.always,
                                hintText: 'Enter pickup location',
                                hintStyle: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w400,
                                  color: Color(0xFF94A3B8),
                                ),
                                suffixIcon: _isLoadingLocation
                                    ? const Padding(
                                        padding: EdgeInsets.all(10),
                                        child: SizedBox(
                                          width: 14,
                                          height: 14,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Color(0xFF009048),
                                          ),
                                        ),
                                      )
                                    : null,
                                isDense: true,
                                contentPadding: const EdgeInsets.only(top: 4),
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                              ),
                            ),

                            Divider(height: 1, color: Colors.grey.shade200),

                            // ── DESTINATION TextField ──
                            TextField(
                              controller: _destinationController,
                              focusNode: _destinationFocusNode,
                              cursorColor: const Color(0xFFE11D48),
                              onTap: () => setState(() {
                                _activeInputTarget = LocationTarget.destination;
                                _showAutocomplete = true;
                              }),
                              onChanged: (val) => _onSearchQueryChanged(
                                  val, LocationTarget.destination),
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: _activeInputTarget ==
                                        LocationTarget.destination
                                    ? const Color(0xFFE11D48)
                                    : const Color(0xFF0F172A),
                              ),
                              decoration: InputDecoration(
                                labelText: 'Destination',
                                labelStyle: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: _activeInputTarget ==
                                          LocationTarget.destination
                                      ? const Color(0xFFE11D48)
                                      : const Color(0xFF64748B),
                                ),
                                floatingLabelBehavior: FloatingLabelBehavior.always,
                                hintText: 'Where to?',
                                hintStyle: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w400,
                                  color: Color(0xFF94A3B8),
                                ),
                                isDense: true,
                                contentPadding: const EdgeInsets.only(top: 4),
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Swap button with rotation transition animation
                      GestureDetector(
                        onTap: _swapLocations,
                        child: RotationTransition(
                          turns: Tween<double>(begin: 0.0, end: 0.5).animate(
                            CurvedAnimation(
                              parent: _rotationController,
                              curve: Curves.easeInOutBack,
                            ),
                          ),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            child: const Icon(Icons.swap_vert_rounded,
                                color: Colors.black54, size: 20),
                          ),
                        ),
                      ),

                    ],
                  ),
                ),

                // ── Autocomplete dropdown ──────────────────────────────────
                if (_showAutocomplete) ...[
                  const SizedBox(height: 8),
                  _buildAutocompleteDropdown(),
                ],
              ],
            ),
          ),

          // ── 4. Dynamic bottom sheet ────────────────────────────────────────
          if (!_showAutocomplete)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _buildDynamicBottomSheet(context),
            ),
        ],
      ),
    );
  }

  Widget _buildAutocompleteDropdown() {
    final isPickup = _activeInputTarget == LocationTarget.pickup;
    final accentColor =
        isPickup ? const Color(0xFF009048) : const Color(0xFFE11D48);

    if (_searchResults.isEmpty && !_isSearching) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.12),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            Icon(Icons.search_rounded, color: accentColor, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                isPickup
                    ? 'Type to search pickup locations...'
                    : 'Type to search destinations...',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                ),
              ),
            ),
          ],
        ),
      );
    }


    final showList = _searchResults;

    return Container(

      constraints: const BoxConstraints(maxHeight: 280),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.12),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: _isSearching
            ? const Padding(
                padding: EdgeInsets.all(24.0),
                child: Center(
                  child: CircularProgressIndicator(
                    color: Color(0xFF009048),
                    strokeWidth: 2.5,
                  ),
                ),
              )
            : ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: showList.length,
                separatorBuilder: (_, __) => Divider(
                  height: 1,
                  indent: 60,
                  endIndent: 16,
                  color: Colors.grey.shade100,
                ),
                itemBuilder: (context, index) {
                  final item = showList[index];
                  final type = item['type'] as String?;

                  IconData typeIcon;
                  switch (type) {
                    case 'home':
                      typeIcon = Icons.home_rounded;
                      break;
                    case 'work':
                      typeIcon = Icons.work_rounded;
                      break;
                    case 'airport':
                      typeIcon = Icons.local_airport_rounded;
                      break;
                    case 'station':
                      typeIcon = Icons.directions_railway_rounded;
                      break;
                    case 'popular':
                      typeIcon = Icons.stars_rounded;
                      break;
                    default:
                      typeIcon = Icons.location_on_rounded;
                  }

                  return InkWell(
                    onTap: () => _onSelectLocationItem(item),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: accentColor.withValues(alpha: 0.08),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              typeIcon,
                              size: 18,
                              color: accentColor,
                            ),
                          ),

                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item['name'] as String,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                if ((item['address'] as String?)?.isNotEmpty ==
                                    true) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    item['address'] as String,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          Icon(Icons.north_west_rounded,
                              size: 14, color: Colors.grey.shade400),
                        ],
                      ),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Private widgets
// ---------------------------------------------------------------------------

class _RouteLoadingChip extends StatelessWidget {
  const _RouteLoadingChip();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 16, height: 16,
            child: CircularProgressIndicator(
                strokeWidth: 2, color: Color(0xFF009048)),
          ),
          SizedBox(width: 10),
          Text('Finding best route...',
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0F172A))),
        ],
      ),
    );
  }
}



class _MapLoadingPlaceholder extends StatelessWidget {
  const _MapLoadingPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFE8EAF0),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: 32, height: 32,
              child: CircularProgressIndicator(
                  strokeWidth: 3, color: Color(0xFF009048)),
            ),
            SizedBox(height: 14),
            Text('Finding your location...',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }
}
