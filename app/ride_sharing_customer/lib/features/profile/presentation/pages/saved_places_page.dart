import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../location/services/places_service.dart';
import '../bloc/profile_bloc.dart';

class SavedPlacesPage extends StatelessWidget {
  const SavedPlacesPage({super.key});

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

          if (state is ProfileLoaded) {
            final rawPlaces = state.userProfile['saved_places'] as List? ?? [];
            final places = rawPlaces.map((e) => Map<String, dynamic>.from(e as Map)).toList();

            if (places.isEmpty) {
              return _buildEmptyState(context);
            }

            return ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFE6F6ED),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF009048).withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF009048).withOpacity(0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.stars_rounded, color: Color(0xFF009048), size: 22),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Quick Booking Access',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF006C36),
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Saved places show up instantly when searching rides & destinations.',
                              style: TextStyle(
                                fontSize: 12,
                                color: Color(0xFF006C36),
                                height: 1.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
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

          return const Center(child: CircularProgressIndicator(color: Color(0xFF009048)));
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
    final type = (place['type'] ?? 'favorite').toString().toLowerCase();
    IconData typeIcon = Icons.star_rounded;
    Color iconColor = const Color(0xFFEAB308);
    Color bgColor = const Color(0xFFFEFCE8);
    String typeLabel = 'Favorite';

    if (type == 'home') {
      typeIcon = Icons.home_rounded;
      iconColor = const Color(0xFF0165B7);
      bgColor = const Color(0xFFEFF6FF);
      typeLabel = 'Home';
    } else if (type == 'work') {
      typeIcon = Icons.work_rounded;
      iconColor = const Color(0xFF009048);
      bgColor = const Color(0xFFE6F6ED);
      typeLabel = 'Work';
    }

    final name = (place['name'] ?? typeLabel).toString();
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
        onTap: () => _showSavePlaceDialog(context, placeToEdit: place, editIndex: index),
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
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: bgColor,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            typeLabel,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: iconColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      address.isNotEmpty ? address : 'No address specified',
                      maxLines: 2,
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
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert_rounded, color: Color(0xFF94A3B8)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                onSelected: (action) {
                  if (action == 'edit') {
                    _showSavePlaceDialog(context, placeToEdit: place, editIndex: index);
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
              final updated = allPlaces.map((e) => Map<String, dynamic>.from(e)).toList()..removeAt(index);
              context.read<ProfileBloc>().add(UpdatePlaces(updated));
              CustomToast.show(context, 'Place removed successfully');
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showSavePlaceDialog(BuildContext context, {Map<String, dynamic>? placeToEdit, int? editIndex}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => _SavePlaceBottomSheet(
        profileBloc: context.read<ProfileBloc>(),
        placeToEdit: placeToEdit,
        editIndex: editIndex,
      ),
    );
  }
}

class _SavePlaceBottomSheet extends StatefulWidget {
  final ProfileBloc profileBloc;
  final Map<String, dynamic>? placeToEdit;
  final int? editIndex;

  const _SavePlaceBottomSheet({
    required this.profileBloc,
    this.placeToEdit,
    this.editIndex,
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

  final PlacesService _placesService = PlacesService();

  @override
  void initState() {
    super.initState();
    _selectedType = (widget.placeToEdit?['type'] ?? widget.placeToEdit?['label'] ?? 'home').toString().toLowerCase();
    if (!['home', 'work', 'favorite'].contains(_selectedType)) {
      _selectedType = 'favorite';
    }

    final defaultName = widget.placeToEdit?['name'] ?? (_selectedType == 'home' ? 'Home' : (_selectedType == 'work' ? 'Work' : ''));
    _nameController = TextEditingController(text: defaultName);
    _addressController = TextEditingController(text: widget.placeToEdit?['address'] ?? '');

    if (widget.placeToEdit?['latitude'] != null) {
      _lat = double.tryParse(widget.placeToEdit!['latitude'].toString()) ?? 22.5726;
    }
    if (widget.placeToEdit?['longitude'] != null) {
      _lng = double.tryParse(widget.placeToEdit!['longitude'].toString()) ?? 88.3639;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _onAddressChanged(String query) async {
    if (query.trim().length < 2) {
      setState(() {
        _predictions = [];
        _isSearchingPredictions = false;
      });
      return;
    }

    setState(() => _isSearchingPredictions = true);
    try {
      final results = await _placesService.fetchPredictions(query);
      if (mounted) {
        setState(() {
          _predictions = results.map((p) => {
            'placeId': p.placeId,
            'primaryText': p.primaryText,
            'secondaryText': p.secondaryText,
            'fullText': p.fullText,
          }).toList();
          _isSearchingPredictions = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isSearchingPredictions = false);
    }
  }

  void _selectPrediction(Map<String, dynamic> pred) async {
    final fullText = pred['fullText']?.toString() ?? pred['primaryText']?.toString() ?? '';
    _addressController.text = fullText;
    if (_nameController.text.trim().isEmpty) {
      _nameController.text = pred['primaryText']?.toString() ?? '';
    }

    final placeId = pred['placeId']?.toString();
    if (placeId != null && placeId.isNotEmpty) {
      final coords = await _placesService.getLatLngFromPlaceId(placeId);
      if (coords != null) {
        _lat = coords.latitude;
        _lng = coords.longitude;
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
        : (_selectedType == 'home' ? 'Home' : (_selectedType == 'work' ? 'Work' : 'Saved Place'));

    final currentState = widget.profileBloc.state;
    if (currentState is ProfileLoaded) {
      final rawList = currentState.userProfile['saved_places'] as List? ?? [];
      final currentList = rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList();

      final placeData = {
        'id': widget.placeToEdit?['id'] ?? 'place_${DateTime.now().millisecondsSinceEpoch}',
        'type': _selectedType,
        'label': _selectedType,
        'name': finalName,
        'address': address,
        'latitude': _lat,
        'longitude': _lng,
        'isDefaultPickup': widget.placeToEdit?['isDefaultPickup'] ?? false,
      };

      if (widget.editIndex != null) {
        currentList[widget.editIndex!] = placeData;
      } else {
        currentList.add(placeData);
      }

      widget.profileBloc.add(UpdatePlaces(currentList));
      Navigator.pop(context);
      CustomToast.show(context, widget.placeToEdit != null ? 'Place updated successfully' : 'Place saved successfully');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.placeToEdit != null;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
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
            const Text('Place Category', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
            const SizedBox(height: 10),
            Row(
              children: [
                _buildCategoryTab('home', Icons.home_rounded, 'Home'),
                const SizedBox(width: 10),
                _buildCategoryTab('work', Icons.work_rounded, 'Work'),
                const SizedBox(width: 10),
                _buildCategoryTab('favorite', Icons.star_rounded, 'Other'),
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
              decoration: InputDecoration(
                hintText: 'Search street, area or landmark',
                prefixIcon: const Icon(Icons.location_on_outlined, color: Color(0xFF009048)),
                suffixIcon: _isSearchingPredictions
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF009048))),
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF009048), width: 1.5)),
              ),
            ),
            if (_predictions.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                constraints: const BoxConstraints(maxHeight: 180),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
                  ],
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _predictions.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (ctx, i) {
                    final pred = _predictions[i];
                    return ListTile(
                      dense: true,
                      leading: const Icon(Icons.place_rounded, color: Color(0xFF009048), size: 18),
                      title: Text(pred['primaryText'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      subtitle: Text(pred['secondaryText'] ?? '', style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      onTap: () => _selectPrediction(pred),
                    );
                  },
                ),
              ),
            ],
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

  Widget _buildCategoryTab(String type, IconData icon, String label) {
    final isSelected = _selectedType == type;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedType = type;
            if (_nameController.text.trim().isEmpty || _nameController.text == 'Home' || _nameController.text == 'Work') {
              if (type == 'home') _nameController.text = 'Home';
              if (type == 'work') _nameController.text = 'Work';
              if (type == 'favorite') _nameController.text = '';
            }
          });
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF009048).withOpacity(0.12) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? const Color(0xFF009048) : const Color(0xFFE2E8F0),
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: isSelected ? const Color(0xFF009048) : const Color(0xFF64748B), size: 22),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? const Color(0xFF009048) : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

