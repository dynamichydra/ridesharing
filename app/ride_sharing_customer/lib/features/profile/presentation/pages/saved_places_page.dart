import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../location/services/places_service.dart';
import '../../../location/services/geocoding_service.dart';
import '../bloc/profile_bloc.dart';

class SavedPlacesPage extends StatefulWidget {
  const SavedPlacesPage({super.key});

  @override
  State<SavedPlacesPage> createState() => _SavedPlacesPageState();
}

class _SavedPlacesPageState extends State<SavedPlacesPage> {
  @override
  void initState() {
    super.initState();
    context.read<ProfileBloc>().add(LoadProfile());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Saved Places',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A)),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              context.go('/home');
            }
          },
        ),
      ),
      body: BlocBuilder<ProfileBloc, ProfileState>(
        builder: (context, state) {
          if (state is ProfileLoading) {
            return const LoadingView();
          }

          if (state is ProfileError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 48, color: Color(0xFFEF4444)),
                    const SizedBox(height: 16),
                    Text(
                      state.message.isNotEmpty ? state.message : 'Unable to load saved places',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 15, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF009048),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => context.read<ProfileBloc>().add(LoadProfile()),
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            );
          }

          if (state is ProfileLoaded) {
            final rawPlaces = state.userProfile['saved_places'] as List? ?? [];
            final places = rawPlaces.map((e) => Map<String, dynamic>.from(e as Map)).toList();

            if (places.isEmpty) {
              return _buildEmptyState(context);
            }

            return ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              children: [
                const Text(
                  'YOUR PLACES',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                    color: Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 12),
                ...places.asMap().entries.map((entry) {
                  final index = entry.key;
                  final place = entry.value;
                  return _buildPlaceCard(context, place, index, places);
                }),
                const SizedBox(height: 80),
              ],
            );
          }

          // Initial fallback state (not stuck in indefinite spinner)
          return Center(
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF009048),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () => context.read<ProfileBloc>().add(LoadProfile()),
              child: const Text('Load Places'),
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF009048),
        foregroundColor: Colors.white,
        elevation: 3,
        icon: const Icon(Icons.add_location_alt_rounded),
        label: const Text('Add New Place', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () => _showSavePlaceDialog(context),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: const Color(0xFF009048).withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.bookmark_border_rounded,
                size: 56,
                color: Color(0xFF009048),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'No Saved Places Yet',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Save your Home, Work, Gym, or favorite cafe to book rides in one single tap.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: () => _showSavePlaceDialog(context),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Add Your First Place', style: TextStyle(fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF009048),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceCard(
    BuildContext context,
    Map<String, dynamic> place,
    int index,
    List<Map<String, dynamic>> allPlaces,
  ) {
    final type = (place['type'] ?? place['label'] ?? 'favorite').toString().toLowerCase();
    IconData typeIcon = Icons.star_rounded;
    Color iconColor = const Color(0xFFEAB308);
    Color bgColor = const Color(0xFFFEFCE8);
    String defaultName = 'Other';

    if (type == 'home') {
      typeIcon = Icons.home_rounded;
      iconColor = const Color(0xFF0165B7);
      bgColor = const Color(0xFFEFF6FF);
      defaultName = 'Home';
    } else if (type == 'work') {
      typeIcon = Icons.work_rounded;
      iconColor = const Color(0xFF009048);
      bgColor = const Color(0xFFE6F6ED);
      defaultName = 'Work';
    }

    final name = (place['name'] ?? defaultName).toString();
    final address = (place['address'] ?? '').toString();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => _showSavePlaceDialog(context, placeToEdit: place, editIndex: index, allPlaces: allPlaces),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(typeIcon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      address.isNotEmpty ? address : 'No address specified',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              // Pill Go Button matching reference screenshot
              InkWell(
                onTap: () {
                  final lat = double.tryParse((place['latitude'] ?? place['lat'] ?? 22.5726).toString()) ?? 22.5726;
                  final lng = double.tryParse((place['longitude'] ?? place['lng'] ?? 88.3639).toString()) ?? 88.3639;
                  context.push('/select-location', extra: {
                    'destinationName': name,
                    'destinationAddress': address,
                    'destinationLat': lat,
                    'destinationLng': lng,
                  });
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6F6ED),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.near_me_rounded, color: Color(0xFF009048), size: 15),
                      SizedBox(width: 5),
                      Text(
                        'Go',
                        style: TextStyle(
                          color: Color(0xFF009048),
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 2),

              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF94A3B8)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onSelected: (action) {
                  if (action == 'edit') {
                    _showSavePlaceDialog(context, placeToEdit: place, editIndex: index, allPlaces: allPlaces);
                  } else if (action == 'delete') {
                    _confirmDelete(context, place, index, allPlaces);
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(Icons.edit_outlined, size: 18, color: Color(0xFF0F172A)),
                        SizedBox(width: 10),
                        Text('Edit', style: TextStyle(fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFFEF4444)),
                        SizedBox(width: 10),
                        Text('Delete', style: TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFEF4444))),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(
    BuildContext context,
    Map<String, dynamic> place,
    int index,
    List<Map<String, dynamic>> allPlaces,
  ) {
    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Delete Saved Place?'),
        content: Text('Are you sure you want to remove "${place['name'] ?? 'this place'}" from your saved places?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 0,
            ),
            onPressed: () {
              Navigator.pop(dialogCtx);
              final placeId = place['id']?.toString();
              if (placeId != null && placeId.isNotEmpty && !placeId.startsWith('place_')) {
                context.read<ProfileBloc>().add(DeleteSavedPlaceEvent(placeId));
              } else {
                final updated = allPlaces.map((e) => Map<String, dynamic>.from(e)).toList()..removeAt(index);
                context.read<ProfileBloc>().add(UpdatePlaces(updated));
              }
              CustomToast.show(context, 'Place removed successfully');
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showSavePlaceDialog(BuildContext context, {Map<String, dynamic>? placeToEdit, int? editIndex, List<Map<String, dynamic>>? allPlaces}) {
    List<Map<String, dynamic>> placesList = allPlaces ?? [];
    if (placesList.isEmpty) {
      final state = context.read<ProfileBloc>().state;
      if (state is ProfileLoaded) {
        final raw = state.userProfile['saved_places'] as List? ?? [];
        placesList = raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => _SavePlaceBottomSheet(
        profileBloc: context.read<ProfileBloc>(),
        placeToEdit: placeToEdit,
        editIndex: editIndex,
        allPlaces: placesList,
      ),
    );
  }
}

class _SavePlaceBottomSheet extends StatefulWidget {
  final ProfileBloc profileBloc;
  final Map<String, dynamic>? placeToEdit;
  final int? editIndex;
  final List<Map<String, dynamic>>? allPlaces;

  const _SavePlaceBottomSheet({
    required this.profileBloc,
    this.placeToEdit,
    this.editIndex,
    this.allPlaces,
  });

  @override
  State<_SavePlaceBottomSheet> createState() => _SavePlaceBottomSheetState();
}

class _SavePlaceBottomSheetState extends State<_SavePlaceBottomSheet> {
  late TextEditingController _nameController;
  late TextEditingController _addressController;
  late String _selectedType;
  double _lat = 22.5726;
  double _lng = 88.3639;
  bool _isSearchingPredictions = false;
  List<Map<String, dynamic>> _predictions = [];
  bool _hasExistingHome = false;
  bool _hasExistingWork = false;

  final PlacesService _placesService = PlacesService();
  final GeocodingService _geocodingService = GeocodingService();

  @override
  void initState() {
    super.initState();

    _placesService.initialize(AppConstants.googleMapsApiKey);

    final placesList = widget.allPlaces ?? [];
    for (int i = 0; i < placesList.length; i++) {
      if (widget.editIndex != null && i == widget.editIndex) continue;
      final t = (placesList[i]['type'] ?? placesList[i]['label'] ?? '').toString().toLowerCase();
      if (t == 'home') _hasExistingHome = true;
      if (t == 'work') _hasExistingWork = true;
    }

    _selectedType = (widget.placeToEdit?['type'] ?? widget.placeToEdit?['label'] ?? '').toString().toLowerCase();
    if (!['home', 'work', 'favorite'].contains(_selectedType) || _selectedType.isEmpty) {
      // Default to Other (favorite)
      _selectedType = 'favorite';
    }

    final defaultName = widget.placeToEdit?['name'] ?? (_selectedType == 'home' ? 'Home' : (_selectedType == 'work' ? 'Work' : ''));
    _nameController = TextEditingController(text: defaultName);
    _addressController = TextEditingController(text: widget.placeToEdit?['address'] ?? '');

    if (widget.placeToEdit?['latitude'] != null) {
      _lat = double.tryParse(widget.placeToEdit!['latitude'].toString()) ?? 22.5726;
    } else if (widget.placeToEdit?['lat'] != null) {
      _lat = double.tryParse(widget.placeToEdit!['lat'].toString()) ?? 22.5726;
    }

    if (widget.placeToEdit?['longitude'] != null) {
      _lng = double.tryParse(widget.placeToEdit!['longitude'].toString()) ?? 88.3639;
    } else if (widget.placeToEdit?['lng'] != null) {
      _lng = double.tryParse(widget.placeToEdit!['lng'].toString()) ?? 88.3639;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _onAddressChanged(String query) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) {
      setState(() {
        _predictions = [];
        _isSearchingPredictions = false;
      });
      return;
    }

    setState(() => _isSearchingPredictions = true);
    try {
      final results = await _placesService.searchPlacesMulti(cleanQuery);
      if (results.isNotEmpty && mounted) {
        setState(() {
          _predictions = results.map((p) => {
            'placeId': p['placeId'] ?? '',
            'primaryText': p['name'] ?? '',
            'secondaryText': p['address'] ?? '',
            'fullText': p['address'] ?? p['name'] ?? '',
            'latitude': p['latitude'],
            'longitude': p['longitude'],
          }).toList();
          _isSearchingPredictions = false;
        });
        return;
      }

      // Geocoding fallback if no results
      if (cleanQuery.length >= 3) {
        final coord = await _geocodingService.forwardGeocode(cleanQuery);
        if (coord != null && mounted) {
          String displayAddress = cleanQuery;
          try {
            final reversedPlace = await _geocodingService.reverseGeocode(coord);
            if (reversedPlace?.formattedAddress != null && reversedPlace!.formattedAddress.isNotEmpty) {
              displayAddress = reversedPlace.formattedAddress;
            }
          } catch (_) {}

          if (mounted) {
            setState(() {
              _predictions = [
                {
                  'placeId': '',
                  'primaryText': cleanQuery,
                  'secondaryText': displayAddress,
                  'fullText': displayAddress,
                  'latitude': coord.latitude,
                  'longitude': coord.longitude,
                }
              ];
              _isSearchingPredictions = false;
            });
            return;
          }
        }
      }

      if (mounted) {
        setState(() => _isSearchingPredictions = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isSearchingPredictions = false);
    }
  }

  void _selectPrediction(Map<String, dynamic> pred) async {
    final fullText = pred['fullText']?.toString() ?? pred['secondaryText']?.toString() ?? pred['primaryText']?.toString() ?? '';
    final primary = pred['primaryText']?.toString() ?? '';
    
    _addressController.text = fullText;
    if (_nameController.text.trim().isEmpty && primary.isNotEmpty) {
      _nameController.text = primary;
    }

    if (pred['latitude'] != null && pred['longitude'] != null) {
      _lat = (pred['latitude'] as num).toDouble();
      _lng = (pred['longitude'] as num).toDouble();
    } else {
      final placeId = pred['placeId']?.toString();
      if (placeId != null && placeId.isNotEmpty) {
        final coords = await _placesService.getLatLngFromPlaceId(placeId, apiKey: AppConstants.googleMapsApiKey);
        if (coords != null) {
          _lat = coords.latitude;
          _lng = coords.longitude;
        }
      } else {
        final coords = await _geocodingService.forwardGeocode(fullText);
        if (coords != null) {
          _lat = coords.latitude;
          _lng = coords.longitude;
        }
      }
    }

    setState(() => _predictions = []);
  }

  void _save() {
    final name = _nameController.text.trim();
    final address = _addressController.text.trim();
    if (address.isEmpty) {
      CustomToast.show(context, 'Please enter an address');
      return;
    }

    final finalName = name.isNotEmpty
        ? name
        : (_selectedType == 'home' ? 'Home' : (_selectedType == 'work' ? 'Work' : 'Other'));

    final placeData = {
      'type': _selectedType,
      'label': _selectedType,
      'name': finalName,
      'address': address,
      'latitude': _lat,
      'longitude': _lng,
      'lat': _lat.toString(),
      'lng': _lng.toString(),
      'isDefaultPickup': widget.placeToEdit?['isDefaultPickup'] ?? false,
    };

    final placeId = widget.placeToEdit?['id']?.toString();
    if (widget.placeToEdit != null && placeId != null && placeId.isNotEmpty && !placeId.startsWith('place_')) {
      widget.profileBloc.add(UpdateSavedPlaceEvent(placeId, placeData));
    } else {
      widget.profileBloc.add(AddSavedPlaceEvent(placeData));
    }

    Navigator.pop(context);
    CustomToast.show(context, widget.placeToEdit != null ? 'Place updated successfully' : 'Place saved successfully');
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.placeToEdit != null;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    final isHomeDisabled = !isEdit && _hasExistingHome;
    final isWorkDisabled = !isEdit && _hasExistingWork;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isEdit ? 'Edit Saved Place' : 'Add New Place',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B)),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Category', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
            const SizedBox(height: 10),
            Row(
              children: [
                _buildCategoryTab(
                  'home',
                  Icons.home_rounded,
                  'Home',
                  isDisabled: isHomeDisabled,
                ),
                const SizedBox(width: 8),
                _buildCategoryTab(
                  'work',
                  Icons.work_rounded,
                  'Work',
                  isDisabled: isWorkDisabled,
                ),
                const SizedBox(width: 8),
                _buildCategoryTab(
                  'favorite',
                  Icons.star_rounded,
                  'Other',
                  isDisabled: false,
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Text('Place Name / Label', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
            const SizedBox(height: 8),
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                hintText: _selectedType == 'home' ? 'Home' : (_selectedType == 'work' ? 'Work' : 'e.g. Gym, Coffee Shop, Airport'),
                prefixIcon: const Icon(Icons.label_outline_rounded, color: Color(0xFF009048)),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF009048), width: 1.5)),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Full Address', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
            const SizedBox(height: 8),
            TextField(
              controller: _addressController,
              onChanged: _onAddressChanged,
              minLines: 2,
              maxLines: 4,
              keyboardType: TextInputType.multiline,
              decoration: InputDecoration(
                hintText: 'Search street, area, building or landmark...',
                prefixIcon: const Padding(
                  padding: EdgeInsets.only(bottom: 24),
                  child: Icon(Icons.location_on_outlined, color: Color(0xFF009048)),
                ),
                suffixIcon: _isSearchingPredictions
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF009048))),
                      )
                    : (_addressController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 20, color: Color(0xFF94A3B8)),
                            onPressed: () {
                              _addressController.clear();
                              setState(() => _predictions = []);
                            },
                          )
                        : null),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF009048), width: 1.5)),
              ),
            ),
            if (_predictions.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                constraints: const BoxConstraints(maxHeight: 220),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF009048).withValues(alpha: 0.3)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 12, offset: const Offset(0, 4)),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: ListView.separated(
                    shrinkWrap: true,
                    padding: EdgeInsets.zero,
                    itemCount: _predictions.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                    itemBuilder: (ctx, i) {
                      final pred = _predictions[i];
                      return Material(
                        color: Colors.transparent,
                        child: ListTile(
                          dense: true,
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF009048).withValues(alpha: 0.1),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.place_rounded, color: Color(0xFF009048), size: 18),
                          ),
                          title: Text(
                            pred['primaryText'] ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                          ),
                          subtitle: Text(
                            pred['secondaryText'] ?? pred['fullText'] ?? '',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), height: 1.2),
                          ),
                          trailing: const Icon(
                            Icons.north_west_rounded,
                            size: 14,
                            color: Color(0xFF94A3B8),
                          ),
                          onTap: () => _selectPrediction(pred),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: OutlinedButton.icon(
                icon: const Icon(Icons.map_rounded),
                label: const Text('Choose on map', style: TextStyle(fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF009048),
                  side: const BorderSide(color: Color(0xFF009048)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () async {
                  final result = await context.push('/pick-location-map');
                  if (result != null && result is Map<String, dynamic>) {
                    setState(() {
                      _lat = result['latitude'] as double;
                      _lng = result['longitude'] as double;
                      _addressController.text = result['address'] as String;
                    });
                  }
                },
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF009048),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                child: Text(
                  isEdit ? 'Save Changes' : 'Save Place',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryTab(String type, IconData icon, String label, {bool isDisabled = false}) {
    final isSelected = _selectedType == type;
    return Expanded(
      child: GestureDetector(
        onTap: isDisabled
            ? null
            : () {
                setState(() {
                  _selectedType = type;
                  if (_nameController.text.trim().isEmpty || _nameController.text == 'Home' || _nameController.text == 'Work' || _nameController.text == 'Other') {
                    if (type == 'home') _nameController.text = 'Home';
                    if (type == 'work') _nameController.text = 'Work';
                    if (type == 'favorite') _nameController.text = '';
                  }
                });
              },
        child: Opacity(
          opacity: isDisabled ? 0.35 : 1.0,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
            decoration: BoxDecoration(
              color: isSelected
                  ? const Color(0xFFE6F6ED)
                  : (isDisabled ? const Color(0xFFF1F5F9) : const Color(0xFFF8FAFC)),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
                width: isSelected ? 1.5 : 1,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  icon,
                  color: isSelected
                      ? const Color(0xFF009048)
                      : (isDisabled ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
                  size: 18,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected
                          ? const Color(0xFF009048)
                          : (isDisabled ? const Color(0xFF94A3B8) : const Color(0xFF475569)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


