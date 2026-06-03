import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../../../core/widgets/empty_view.dart';
import '../bloc/profile_bloc.dart';

class SavedPlacesPage extends StatelessWidget {
  const SavedPlacesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Saved Places'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
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
              return const EmptyView(
                title: 'No Saved Places',
                message: 'Save your home, work, or favorite places for faster booking.',
                icon: Icons.place_outlined,
              );
            }

            return ListView.separated(
              itemCount: places.length,
              padding: const EdgeInsets.all(AppSpacing.m),
              separatorBuilder: (context, index) => const Divider(),
              itemBuilder: (context, index) {
                final place = places[index];
                IconData icon = Icons.star_rounded;
                if (place['type'] == 'home') icon = Icons.home_rounded;
                if (place['type'] == 'work') icon = Icons.work_rounded;

                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  onTap: () => _showSavePlaceDialog(context, placeToEdit: place, editIndex: index),
                  leading: Container(
                    padding: const EdgeInsets.all(AppSpacing.s),
                    decoration: BoxDecoration(
                      color: isDark ? Colors.grey[850] : Colors.grey[100],
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: AppColors.primaryBlue),
                  ),
                  title: Text(
                    place['name'] as String,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    place['address'] as String,
                    style: theme.textTheme.bodyMedium?.copyWith(fontSize: 12),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.edit_outlined, size: 18, color: theme.hintColor),
                      const SizedBox(width: AppSpacing.s),
                      IconButton(
                        icon: Icon(Icons.delete_outline_rounded, color: theme.colorScheme.error),
                        onPressed: () {
                          final updated = places.map((e) => Map<String, dynamic>.from(e)).toList()..removeAt(index);
                          context.read<ProfileBloc>().add(UpdatePlaces(updated));
                        },
                      ),
                    ],
                  ),
                );
              },
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: theme.colorScheme.primary,
        foregroundColor: theme.colorScheme.onPrimary,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Place'),
        onPressed: () => _showSavePlaceDialog(context),
      ),
    );
  }

  void _showSavePlaceDialog(BuildContext context, {Map<String, dynamic>? placeToEdit, int? editIndex}) {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return _SavePlaceDialog(
          profileBloc: context.read<ProfileBloc>(),
          placeToEdit: placeToEdit,
          editIndex: editIndex,
        );
      },
    );
  }
}

class _SavePlaceDialog extends StatefulWidget {
  final ProfileBloc profileBloc;
  final Map<String, dynamic>? placeToEdit;
  final int? editIndex;

  const _SavePlaceDialog({
    required this.profileBloc,
    this.placeToEdit,
    this.editIndex,
  });

  @override
  State<_SavePlaceDialog> createState() => _SavePlaceDialogState();
}

class _SavePlaceDialogState extends State<_SavePlaceDialog> {
  late TextEditingController _nameController;
  late TextEditingController _addressController;
  late String _selectedType;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.placeToEdit?['name'] ?? '');
    _addressController = TextEditingController(text: widget.placeToEdit?['address'] ?? '');
    _selectedType = widget.placeToEdit?['type'] ?? 'favorite';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  void _save() {
    final name = _nameController.text.trim();
    final address = _addressController.text.trim();
    if (name.isEmpty || address.isEmpty) return;

    final currentState = widget.profileBloc.state;
    if (currentState is ProfileLoaded) {
      final rawList = currentState.userProfile['saved_places'] as List? ?? [];
      final currentList = rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList();

      final placeData = {
        'id': widget.placeToEdit?['id'] ?? 'place_${DateTime.now().millisecondsSinceEpoch}',
        'type': _selectedType,
        'name': name,
        'address': address,
        'latitude': widget.placeToEdit?['latitude'] ?? 12.9716 + (DateTime.now().millisecond / 100000.0),
        'longitude': widget.placeToEdit?['longitude'] ?? 77.5946 + (DateTime.now().millisecond / 100000.0),
      };

      if (widget.editIndex != null) {
        currentList[widget.editIndex!] = placeData;
      } else {
        currentList.add(placeData);
      }

      widget.profileBloc.add(UpdatePlaces(currentList));
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.placeToEdit != null;
    return AlertDialog(
      title: Text(isEdit ? 'Edit Saved Place' : 'Add Saved Place'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Name (e.g. Gym, Cafe)'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _addressController,
              decoration: const InputDecoration(labelText: 'Address'),
            ),
            const SizedBox(height: 16),
            const Text('Place Type', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildTypeChip('home', Icons.home_rounded, 'Home'),
                _buildTypeChip('work', Icons.work_rounded, 'Work'),
                _buildTypeChip('favorite', Icons.star_rounded, 'Other'),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _save,
          child: const Text('Save'),
        ),
      ],
    );
  }

  Widget _buildTypeChip(String type, IconData icon, String label) {
    final isSelected = _selectedType == type;
    return ChoiceChip(
      avatar: Icon(icon, size: 16, color: isSelected ? Colors.white : AppColors.primaryBlue),
      label: Text(label),
      selected: isSelected,
      onSelected: (val) {
        if (val) {
          setState(() {
            _selectedType = type;
          });
        }
      },
    );
  }
}
