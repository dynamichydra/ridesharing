import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../home/presentation/bloc/home_bloc.dart';
import '../../../location/location.dart';
import '../bloc/booking_bloc.dart';

enum LocationTarget { pickup, destination }

class SelectLocationPage extends StatefulWidget {
  const SelectLocationPage({super.key});

  @override
  State<SelectLocationPage> createState() => _SelectLocationPageState();
}

class _SelectLocationPageState extends State<SelectLocationPage> {
  final _pickupController = TextEditingController(text: 'Current Location');
  final _destinationController = TextEditingController();
  final _focusNode = FocusNode();

  final PlacesService _placesService = PlacesService();
  final GeocodingService _geocodingService = GeocodingService();

  LatLng _pickupLatLng = const LatLng(12.9716, 77.5946); // Default Bengaluru
  LocationTarget _activePickingTarget = LocationTarget.destination;
  bool _isMapPickerVisible = false;
  bool _isSearchingPlaces = false;
  List<Map<String, dynamic>> _searchResults = [];

  @override
  void initState() {
    super.initState();
    _placesService.initialize(AppConstants.googleMapsApiKey);
    context.read<HomeBloc>().add(SearchPlacesQueryChanged(''));

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _pickupController.dispose();
    _destinationController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _onSearchQueryChanged(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearchingPlaces = false;
      });
      return;
    }

    setState(() {
      _isSearchingPlaces = true;
    });

    try {
      final predictions = await _placesService.fetchPredictions(query);
      if (predictions.isNotEmpty) {
        final List<Map<String, dynamic>> mapped = predictions.map((pred) {
          return {
            'placeId': pred.placeId,
            'name': pred.primaryText,
            'address': pred.fullText,
            'type': 'place',
          };
        }).toList();

        if (mounted) {
          setState(() {
            _searchResults = mapped;
            _isSearchingPlaces = false;
          });
        }
      } else {
        final LatLng? coord = await _geocodingService.forwardGeocode(query);
        if (coord != null && mounted) {
          setState(() {
            _searchResults = [
              {
                'name': query,
                'address':
                    '${coord.latitude.toStringAsFixed(4)}, ${coord.longitude.toStringAsFixed(4)}',
                'latitude': coord.latitude,
                'longitude': coord.longitude,
                'type': 'geocode',
              }
            ];
            _isSearchingPlaces = false;
          });
        } else if (mounted) {
          setState(() {
            _searchResults = [];
            _isSearchingPlaces = false;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isSearchingPlaces = false;
        });
      }
    }
  }

  Future<void> _onPlaceSelected(Map<String, dynamic> place) async {
    LatLng destLatLng;
    String name = (place['name'] as String?) ?? 'Selected Location';
    String address = (place['address'] as String?) ?? '';

    if (place['latitude'] != null && place['longitude'] != null) {
      destLatLng =
          LatLng(place['latitude'] as double, place['longitude'] as double);
    } else if (place['placeId'] != null) {
      final LatLng? fetchedCoord =
          await _placesService.getLatLngFromPlaceId(place['placeId'] as String);
      destLatLng = fetchedCoord ?? const LatLng(12.9716, 77.5946);
    } else {
      final LatLng? forwardCoord =
          await _geocodingService.forwardGeocode('$name $address');
      destLatLng = forwardCoord ?? const LatLng(12.9716, 77.5946);
    }

    _confirmLocationAndNavigate(destLatLng, name, address);
  }

  void _confirmLocationAndNavigate(
      LatLng destinationLatLng, String destinationName, String destinationAddress) {
    context.read<BookingBloc>().add(
          SetRideLocations(
            pickup: _pickupLatLng,
            pickupName: _pickupController.text,
            pickupAddress: 'Pickup Location',
            destination: destinationLatLng,
            destinationName: destinationName,
            destinationAddress:
                destinationAddress.isNotEmpty ? destinationAddress : destinationName,
          ),
        );
    context.pushReplacement('/ride-options');
  }

  void _onMapLocationConfirmed(LocationModel location) {
    final latLng = LatLng(location.latitude, location.longitude);
    final placeName =
        location.street ?? location.locality ?? 'Selected Location';

    if (_activePickingTarget == LocationTarget.pickup) {
      setState(() {
        _pickupLatLng = latLng;
        _pickupController.text = placeName;
        _isMapPickerVisible = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Pickup location set to: $placeName'),
          duration: const Duration(seconds: 2),
        ),
      );
    } else {
      _confirmLocationAndNavigate(
        latLng,
        placeName,
        location.formattedAddress,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final String mapPickerTitle = _activePickingTarget == LocationTarget.pickup
        ? 'Pick Pickup Location on Map'
        : 'Pick Destination on Map';

    final String mapConfirmText = _activePickingTarget == LocationTarget.pickup
        ? 'Confirm Pickup Location'
        : 'Confirm Destination Location';

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: Text(_isMapPickerVisible ? mapPickerTitle : 'Choose Destination'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () {
            if (_isMapPickerVisible) {
              setState(() {
                _isMapPickerVisible = false;
              });
            } else {
              context.pop();
            }
          },
        ),
      ),
      body: SafeArea(
        child: _isMapPickerVisible
            ? GoogleMapPicker(
                mapStyle: isDark ? AppMapStyles.darkTheme : AppMapStyles.uberSilver,
                initialPosition: _pickupLatLng,
                confirmButtonText: mapConfirmText,
                onLocationConfirmed: _onMapLocationConfirmed,
              )
            : Column(
                children: [
                  // Inputs Panel
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.m),
                    color: isDark ? AppColors.darkSurface : Colors.white,
                    child: Row(
                      children: [
                        // Side graphic line indicator
                        Column(
                          children: [
                            const Icon(Icons.radio_button_checked_rounded,
                                color: AppColors.primaryBlue, size: 20),
                            Container(
                              width: 2,
                              height: 40,
                              color: Colors.grey[400],
                            ),
                            const Icon(Icons.location_on_rounded,
                                color: AppColors.errorRed, size: 20),
                          ],
                        ),
                        const SizedBox(width: AppSpacing.m),

                        // Input fields with Map buttons on EACH bar
                        Expanded(
                          child: Column(
                            children: [
                              // 1. Pickup Input Bar with Map button
                              CustomTextField(
                                controller: _pickupController,
                                labelText: 'Pickup Location',
                                prefixIcon: null,
                                suffixIcon: Tooltip(
                                  message: 'Pick pickup location on map',
                                  child: IconButton(
                                    icon: const Icon(Icons.map_outlined,
                                        color: AppColors.primaryBlue, size: 22),
                                    onPressed: () {
                                      setState(() {
                                        _activePickingTarget = LocationTarget.pickup;
                                        _isMapPickerVisible = true;
                                      });
                                    },
                                  ),
                                ),
                              ),
                              const SizedBox(height: AppSpacing.s),

                              // 2. Destination Input Bar with Map button
                              CustomTextField(
                                controller: _destinationController,
                                labelText: 'Where to?',
                                prefixIcon: null,
                                focusNode: _focusNode,
                                suffixIcon: Tooltip(
                                  message: 'Pick destination on map',
                                  child: IconButton(
                                    icon: const Icon(Icons.map_rounded,
                                        color: AppColors.errorRed, size: 22),
                                    onPressed: () {
                                      setState(() {
                                        _activePickingTarget = LocationTarget.destination;
                                        _isMapPickerVisible = true;
                                      });
                                    },
                                  ),
                                ),
                                onChanged: (val) {
                                  _onSearchQueryChanged(val);
                                  context
                                      .read<HomeBloc>()
                                      .add(SearchPlacesQueryChanged(val));
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),

                  // Quick Action Bar to pick destination on map
                  ListTile(
                    tileColor: isDark ? AppColors.darkSurface : Colors.white,
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Color(0xFFE6F5EC),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.map_rounded,
                          color: AppColors.primaryBlue, size: 20),
                    ),
                    title: const Text(
                      'Choose destination on map',
                      style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryBlue),
                    ),
                    subtitle: const Text(
                      'Drag pin on map to pick exact location',
                      style: TextStyle(fontSize: 12),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded,
                        color: AppColors.primaryBlue),
                    onTap: () {
                      setState(() {
                        _activePickingTarget = LocationTarget.destination;
                        _isMapPickerVisible = true;
                      });
                    },
                  ),
                  const Divider(height: 1),

                  // Searching Indicator
                  if (_isSearchingPlaces)
                    const Padding(
                      padding: EdgeInsets.all(16.0),
                      child: Center(child: CircularProgressIndicator()),
                    ),

                  // Results list
                  Expanded(
                    child: BlocBuilder<HomeBloc, HomeState>(
                      builder: (context, state) {
                        if (state is HomeLoaded) {
                          final List<Map<String, dynamic>> showList;

                          if (_searchResults.isNotEmpty) {
                            showList = _searchResults;
                          } else if (state.searchResults.isNotEmpty) {
                            showList = state.searchResults;
                          } else {
                            showList = state.savedPlaces;
                          }

                          if (showList.isEmpty &&
                              _destinationController.text.isNotEmpty &&
                              !_isSearchingPlaces) {
                            return const Center(
                              child: Text('No places found. Try another query.'),
                            );
                          }

                          return ListView.separated(
                            itemCount: showList.length,
                            padding: const EdgeInsets.all(AppSpacing.m),
                            separatorBuilder: (context, index) => const Divider(),
                            itemBuilder: (context, index) {
                              final place = showList[index];

                              IconData icon = Icons.location_on_outlined;
                              if (place['type'] == 'home') icon = Icons.home_rounded;
                              if (place['type'] == 'work') icon = Icons.work_rounded;
                              if (place['type'] == 'favorite') icon = Icons.star_rounded;
                              if (place['type'] == 'place' ||
                                  place['type'] == 'geocode') {
                                icon = Icons.place_rounded;
                              }

                              return ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color:
                                        isDark ? Colors.grey[850] : Colors.grey[100],
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(icon,
                                      color: AppColors.primaryBlue, size: 20),
                                ),
                                title: Text(
                                  place['name'] as String? ?? 'Place',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                                subtitle: Text(
                                  place['address'] as String? ?? '',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: theme.textTheme.bodyMedium
                                      ?.copyWith(fontSize: 12),
                                ),
                                onTap: () => _onPlaceSelected(place),
                              );
                            },
                          );
                        }
                        return const Center(child: CircularProgressIndicator());
                      },
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
