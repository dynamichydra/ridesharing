import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../style/appcolors.dart';

class ProfilePhotoScreen extends StatefulWidget {
  final String? currentPhotoUrl;
  final Function({required List<int> bytes, required String contentType})
  onUpload;

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
  Uint8List? _localPhotoBytes;
  String? _localContentType;
  final ImagePicker _imagePicker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    debugPrint('[ProfilePhotoScreen] Pick image initiated. Source: $source');
    try {
      final XFile? file = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1000,
        maxHeight: 1000,
        imageQuality: 85,
      );

      if (file == null) {
        debugPrint('[ProfilePhotoScreen] No image selected');
        return;
      }

      final bytes = await file.readAsBytes();
      String contentType = 'image/jpeg';
      final pathLower = file.path.toLowerCase();
      if (pathLower.endsWith('.png')) {
        contentType = 'image/png';
      }

      setState(() {
        _localPhotoBytes = bytes;
        _localContentType = contentType;
      });
      debugPrint(
        '[ProfilePhotoScreen] Image successfully loaded locally for preview',
      );
    } catch (e) {
      debugPrint('[ProfilePhotoScreen] Error picking image: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to select photo: $e')));
      }
    }
  }

  void _clearSelection() {
    setState(() {
      _localPhotoBytes = null;
      _localContentType = null;
    });
  }

  Future<void> _submitUpload() async {
    if (_localPhotoBytes == null || _localContentType == null) return;
    setState(() {
      _uploading = true;
    });

    try {
      await widget.onUpload(
        bytes: _localPhotoBytes!,
        contentType: _localContentType!,
      );
    } catch (e) {
      debugPrint('[ProfilePhotoScreen] Upload failed: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to upload photo: $e')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _uploading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasLocalSelection = _localPhotoBytes != null;

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          Text(
            hasLocalSelection ? 'Confirm Profile Photo' : 'Profile Photo',
            style: const TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            hasLocalSelection
                ? 'Check the preview below. Make sure your face is centered, clear, and clearly visible before uploading.'
                : 'Riders use your profile photo to identify you when you arrive. Make sure your face is clearly visible.',
            style: const TextStyle(
              fontSize: 15,
              color: AppColors.textSecondary,
            ),
          ),
          const Spacer(),
          Center(
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Circular outer border container for visual polish
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: hasLocalSelection
                          ? AppColors.primary
                          : AppColors.border,
                      width: 3,
                    ),
                  ),
                  child: ClipOval(
                    child: SizedBox(
                      width: 180,
                      height: 180,
                      child: _buildAvatarImage(),
                    ),
                  ),
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
          if (!hasLocalSelection) ...[
            ElevatedButton.icon(
              onPressed: _uploading
                  ? null
                  : () => _pickImage(ImageSource.camera),
              icon: const Icon(Icons.camera_alt_rounded),
              label: const Text('Take Photo with Camera'),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: _uploading
                  ? null
                  : () => _pickImage(ImageSource.gallery),
              icon: const Icon(Icons.photo_library_rounded),
              label: const Text('Select from Gallery'),
            ),
          ] else ...[
            ElevatedButton.icon(
              onPressed: _uploading ? null : _submitUpload,
              icon: const Icon(Icons.cloud_upload_rounded),
              label: const Text('Confirm & Upload'),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _uploading
                        ? null
                        : () => _pickImage(
                            _localContentType == 'image/png'
                                ? ImageSource.gallery
                                : ImageSource.camera,
                          ),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Retake'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _uploading ? null : _clearSelection,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.redAccent,
                      side: const BorderSide(color: Colors.redAccent),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAvatarImage() {
    if (_localPhotoBytes != null) {
      return Image.memory(_localPhotoBytes!, fit: BoxFit.cover);
    }

    if (widget.currentPhotoUrl != null && widget.currentPhotoUrl!.isNotEmpty) {
      return Image.network(
        widget.currentPhotoUrl!,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return const Icon(
            Icons.person_rounded,
            size: 90,
            color: AppColors.textSecondary,
          );
        },
      );
    }

    return const Icon(
      Icons.person_rounded,
      size: 90,
      color: AppColors.textSecondary,
    );
  }
}
