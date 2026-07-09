import 'package:flutter/material.dart';
import '../../style/appcolors.dart';

class ProfilePhotoScreen extends StatefulWidget {
  final String? currentPhotoUrl;
  final Function({required List<int> bytes, required String contentType}) onUpload;

  const ProfilePhotoScreen({
    super.key,
    this.currentPhotoUrl,
    required this.onUpload,
  });

  @override
  State<ProfilePhotoScreen> createState() => _ProfilePhotoScreenState();
}

class _ProfilePhotoScreenState extends State<ProfilePhotoScreen> {
  bool _uploading = false;

  void _triggerUpload() {
    debugPrint('[ProfilePhotoScreen] Simulated photo capture initiated');
    setState(() {
      _uploading = true;
    });
    
    // Simulate picking and uploading a 200kb image file
    final List<int> simulatedBytes = List.filled(200, 0);

    Future.delayed(const Duration(seconds: 1), () {
      debugPrint('[ProfilePhotoScreen] Simulated photo capture successfully finished. Triggering callback.');
      widget.onUpload(
        bytes: simulatedBytes,
        contentType: 'image/jpeg',
      );
      if (mounted) {
        setState(() {
          _uploading = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          const Text(
            'Profile Photo',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 8),
          const Text(
            'Riders use your profile photo to identify you when you arrive. Make sure your face is clearly visible.',
            style: TextStyle(fontSize: 15, color: AppColors.textSecondary),
          ),
          const Spacer(),
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 90,
                  backgroundColor: AppColors.surface,
                  backgroundImage: widget.currentPhotoUrl != null ? NetworkImage(widget.currentPhotoUrl!) : null,
                  child: widget.currentPhotoUrl == null
                      ? const Icon(Icons.person_rounded, size: 90, color: AppColors.textSecondary)
                      : null,
                ),
                if (_uploading)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.4),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: CircularProgressIndicator(color: Colors.white),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const Spacer(),
          ElevatedButton.icon(
            onPressed: () {
              debugPrint('[ProfilePhotoScreen] Capture & Upload Photo button clicked');
              if (!_uploading) _triggerUpload();
            },
            icon: const Icon(Icons.camera_alt_rounded),
            label: const Text('Capture & Upload Photo'),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () {
              debugPrint('[ProfilePhotoScreen] Select from Gallery button clicked');
              if (!_uploading) _triggerUpload();
            },
            child: const Text('Select from Gallery'),
          ),
        ],
      ),
    );
  }
}
