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
                  trailing: IconButton(
                    icon: Icon(Icons.delete_outline_rounded, color: theme.colorScheme.error),
                    onPressed: () {
                      final updated = places.map((e) => Map<String, dynamic>.from(e)).toList()..removeAt(index);
                      context.read<ProfileBloc>().add(UpdatePlaces(updated));
                    },
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
        onPressed: () {
          // Trigger a mock dialog add
          showDialog(
            context: context,
            builder: (context) {
              final nameCtrl = TextEditingController();
              final addrCtrl = TextEditingController();
              return AlertDialog(
                title: const Text('Add Saved Place'),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name (e.g. Gym)')),
                    const SizedBox(height: 8),
                    TextField(controller: addrCtrl, decoration: const InputDecoration(labelText: 'Address')),
                  ],
                ),
                actions: [
                  TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                  TextButton(
                    onPressed: () {
                      if (nameCtrl.text.isNotEmpty && addrCtrl.text.isNotEmpty) {
                        final currentState = BlocProvider.of<ProfileBloc>(context).state;
                        if (currentState is ProfileLoaded) {
                          final rawList = currentState.userProfile['saved_places'] as List? ?? [];
                          final currentList = rawList.map((e) => Map<String, dynamic>.from(e as Map)).toList();
                          currentList.add({
                            'id': 'place_${DateTime.now().millisecondsSinceEpoch}',
                            'type': 'favorite',
                            'name': nameCtrl.text.trim(),
                            'address': addrCtrl.text.trim(),
                            'latitude': 12.9716,
                            'longitude': 77.5946,
                          });
                          BlocProvider.of<ProfileBloc>(context).add(UpdatePlaces(currentList));
                        }
                      }
                      Navigator.pop(context);
                    },
                    child: const Text('Save'),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}
