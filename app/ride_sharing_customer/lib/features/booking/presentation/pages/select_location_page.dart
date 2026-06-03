import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../home/presentation/bloc/home_bloc.dart';
import '../bloc/booking_bloc.dart';

class SelectLocationPage extends StatefulWidget {
  const SelectLocationPage({super.key});

  @override
  State<SelectLocationPage> createState() => _SelectLocationPageState();
}

class _SelectLocationPageState extends State<SelectLocationPage> {
  final _pickupController = TextEditingController(text: 'Current Location');
  final _destinationController = TextEditingController();
  final _focusNode = FocusNode();

  LatLng _pickupLatLng = const LatLng(12.9716, 77.5946); // Default Bengaluru UB City

  @override
  void initState() {
    super.initState();
    // Preload all location lists
    context.read<HomeBloc>().add(SearchPlacesQueryChanged(''));
    
    // Focus destination immediately
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

  void _onPlaceSelected(Map<String, dynamic> place) {
    final destLatLng = LatLng(place['latitude'] as double, place['longitude'] as double);

    context.read<BookingBloc>().add(
          SetRideLocations(
            pickup: _pickupLatLng,
            pickupName: 'Current Location',
            pickupAddress: 'UB City, Bengaluru, KA',
            destination: destLatLng,
            destinationName: place['name'] as String,
            destinationAddress: place['address'] as String,
          ),
        );
    context.pushReplacement('/ride-options');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Choose Destination'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
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
                      const Icon(Icons.radio_button_checked_rounded, color: AppColors.primaryBlue, size: 20),
                      Container(
                        width: 2,
                        height: 40,
                        color: Colors.grey[400],
                      ),
                      const Icon(Icons.location_on_rounded, color: AppColors.errorRed, size: 20),
                    ],
                  ),
                  const SizedBox(width: AppSpacing.m),
                  // Form fields
                  Expanded(
                    child: Column(
                      children: [
                        CustomTextField(
                          controller: _pickupController,
                          labelText: 'Pickup Location',
                          prefixIcon: null,
                          readOnly: true,
                        ),
                        const SizedBox(height: AppSpacing.s),
                        CustomTextField(
                          controller: _destinationController,
                          labelText: 'Where to?',
                          prefixIcon: null,
                          focusNode: _focusNode,
                          onChanged: (val) {
                            context.read<HomeBloc>().add(SearchPlacesQueryChanged(val));
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            // Results list
            Expanded(
              child: BlocBuilder<HomeBloc, HomeState>(
                builder: (context, state) {
                  if (state is HomeLoaded) {
                    final results = state.searchResults;

                    if (results.isEmpty && _destinationController.text.isNotEmpty) {
                      return const Center(
                        child: Text('No places found. Try another query.'),
                      );
                    }

                    final showList = results.isEmpty ? state.savedPlaces : results;

                    return ListView.separated(
                      itemCount: showList.length,
                      padding: const EdgeInsets.all(AppSpacing.m),
                      separatorBuilder: (context, index) => const Divider(),
                      itemBuilder: (context, index) {
                        final place = showList[index];
                        final isSaved = place['type'] != null;
                        
                        IconData icon = Icons.location_on_outlined;
                        if (place['type'] == 'home') icon = Icons.home_rounded;
                        if (place['type'] == 'work') icon = Icons.work_rounded;
                        if (place['type'] == 'favorite') icon = Icons.star_rounded;

                        return ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark ? Colors.grey[850] : Colors.grey[100],
                              shape: BoxShape.circle,
                            ),
                            child: Icon(icon, color: AppColors.primaryBlue, size: 20),
                          ),
                          title: Text(
                            place['name'] as String,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            place['address'] as String,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
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
