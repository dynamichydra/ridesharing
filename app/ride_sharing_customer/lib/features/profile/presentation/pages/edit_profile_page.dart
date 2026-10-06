import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../../core/widgets/loading_view.dart';
import '../bloc/profile_bloc.dart';

class EditProfilePage extends StatefulWidget {
  const EditProfilePage({super.key});

  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  String _phonePrefix = '+91 ';
  String _currencyCode = 'INR';
  bool _initialized = false;

  @override
  void dispose() {
    if (_initialized) {
      _nameController.dispose();
      _emailController.dispose();
      _phoneController.dispose();
    }
    super.dispose();
  }

  void _showImageSourceBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_rounded, color: Color(0xFF009048)),
              title: const Text('Choose from Gallery', style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.of(ctx).pop();
                _pickImage(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded, color: Color(0xFF009048)),
              title: const Text('Take Photo', style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.of(ctx).pop();
                _pickImage(ImageSource.camera);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );
      if (picked != null) {
        if (mounted) {
          context.read<ProfileBloc>().add(UploadProfilePhoto(File(picked.path)));
        }
      }
    } catch (e) {
      if (mounted) {
        CustomToast.show(context, 'Failed to select image');
      }
    }
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      context.read<ProfileBloc>().add(
            UpdateProfileDetails(
              name: _nameController.text.trim(),
              email: _emailController.text.trim(),
              phone: '$_phonePrefix${_phoneController.text.trim()}',
              currencyCode: _currencyCode,
            ),
          );
    }
  }

  Widget _buildEditableFieldCard({
    required Widget icon,
    required String label,
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
    VoidCallback? onTap,
    bool readOnly = false,
    String? prefixText,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: 12.0),
            child: icon,
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF718096),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                TextFormField(
                  controller: controller,
                  keyboardType: keyboardType,
                  readOnly: readOnly,
                  onTap: onTap,
                  style: const TextStyle(
                    fontSize: 15,
                    color: Color(0xFF0A2540),
                    fontWeight: FontWeight.bold,
                  ),
                  decoration: InputDecoration(
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    border: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    errorBorder: InputBorder.none,
                    disabledBorder: InputBorder.none,
                    prefixText: prefixText,
                    prefixStyle: const TextStyle(
                      fontSize: 15,
                      color: Color(0xFF0A2540),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  validator: validator,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Edit Profile',
          style: TextStyle(
            color: Color(0xFF0A2540),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new_rounded,
            color: Color(0xFF0A2540),
            size: 20,
          ),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<ProfileBloc, ProfileState>(
        listener: (context, state) {
          if (state is ProfileUpdateSuccess) {
            CustomToast.show(context, 'Profile updated successfully!');
            context.pop();
          } else if (state is ProfileError) {
            CustomToast.show(context, state.message);
          }
        },
        builder: (context, state) {
          if (state is ProfileLoading && !_initialized) {
            return const LoadingView();
          }

          if (state is ProfileLoaded) {
            if (!_initialized) {
              final name = state.userProfile['name'] as String? ?? 'John Doe';
              final email = state.userProfile['email'] as String? ?? 'john.doe@email.com';
              final fullPhone = state.userProfile['phone'] as String? ?? '+91 98765 43210';

              String phonePrefix = '+91 ';
              String phoneBody = fullPhone;

              if (fullPhone.startsWith('+')) {
                final spaceIndex = fullPhone.indexOf(' ');
                if (spaceIndex != -1) {
                  phonePrefix = fullPhone.substring(0, spaceIndex + 1);
                  phoneBody = fullPhone.substring(spaceIndex + 1);
                } else if (fullPhone.length > 3) {
                  phonePrefix = fullPhone.substring(0, 3) + ' ';
                  phoneBody = fullPhone.substring(3);
                }
              }

              _nameController = TextEditingController(text: name);
              _emailController = TextEditingController(text: email);
              _phoneController = TextEditingController(text: phoneBody);
              _phonePrefix = phonePrefix;
              _currencyCode = state.userProfile['currency_code']?.toString().toUpperCase() ?? 'INR';
              _initialized = true;
            }

            final isLoading = state is ProfileLoading;

            return SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      // Centered Profile Avatar Header
                      Center(
                        child: Column(
                          children: [
                            GestureDetector(
                              onTap: () => _showImageSourceBottomSheet(context),
                              child: Stack(
                                children: [
                                  Builder(
                                    builder: (context) {
                                      final rawUrl = (state.userProfile['avatar'] ?? state.userProfile['profilePhoto']) as String?;
                                      if (rawUrl != null && rawUrl.trim().isNotEmpty) {
                                        return Container(
                                          width: 90,
                                          height: 90,
                                          decoration: const BoxDecoration(
                                            color: Color(0xFFE6F4ED),
                                            shape: BoxShape.circle,
                                          ),
                                          child: ClipOval(
                                            child: Image.network(
                                              rawUrl,
                                              width: 90,
                                              height: 90,
                                              fit: BoxFit.cover,
                                              errorBuilder: (context, error, stackTrace) => const Center(
                                                child: Icon(
                                                  Icons.person_rounded,
                                                  size: 56,
                                                  color: Color(0xFF009048),
                                                ),
                                              ),
                                            ),
                                          ),
                                        );
                                      }
                                      return Container(
                                        width: 90,
                                        height: 90,
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFE6F4ED),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Center(
                                          child: Icon(
                                            Icons.person_rounded,
                                            size: 56,
                                            color: Color(0xFF009048),
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                  Positioned(
                                    bottom: 0,
                                    right: 0,
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.1),
                                            blurRadius: 4,
                                            offset: const Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                      child: const Icon(
                                        Icons.camera_alt_rounded,
                                        color: Color(0xFF009048),
                                        size: 16,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            ValueListenableBuilder<TextEditingValue>(
                              valueListenable: _nameController,
                              builder: (context, value, child) {
                                return Text(
                                  value.text.isNotEmpty ? value.text : 'John Doe',
                                  style: const TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF0A2540),
                                  ),
                                );
                              },
                            ),
                            const SizedBox(height: 4),
                            ValueListenableBuilder<TextEditingValue>(
                              valueListenable: _emailController,
                              builder: (context, value, child) {
                                return Text(
                                  value.text.isNotEmpty ? value.text : 'john.doe@email.com',
                                  style: const TextStyle(
                                    fontSize: 14,
                                    color: Color(0xFF718096),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Full Name Card
                      _buildEditableFieldCard(
                        icon: const Icon(Icons.person_outline_rounded, color: Color(0xFF009048), size: 22),
                        label: 'Full Name',
                        controller: _nameController,
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Please enter your name';
                          }
                          return null;
                        },
                      ),

                      // Email Address Card
                      _buildEditableFieldCard(
                        icon: const Icon(Icons.email_outlined, color: Color(0xFF009048), size: 22),
                        label: 'Email Address',
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Please enter your email';
                          }
                          if (!val.contains('@')) {
                            return 'Please enter a valid email';
                          }
                          return null;
                        },
                      ),

                      // Phone Number Card
                      _buildEditableFieldCard(
                        icon: const Icon(Icons.phone_outlined, color: Color(0xFF009048), size: 22),
                        label: 'Phone Number',
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        prefixText: _phonePrefix,
                      ),

                      // Currency Preference Card
                      Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(right: 12.0),
                              child: Icon(Icons.payments_outlined, color: Color(0xFF009048), size: 22),
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Padding(
                                    padding: EdgeInsets.only(top: 8),
                                    child: Text(
                                      'Preferred Currency',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF718096),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      value: _currencyCode,
                                      isExpanded: true,
                                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF0A2540)),
                                      style: const TextStyle(
                                        fontSize: 15,
                                        color: Color(0xFF0A2540),
                                        fontWeight: FontWeight.bold,
                                      ),
                                      items: const [
                                        DropdownMenuItem(value: 'INR', child: Text('INR (₹)')),
                                        DropdownMenuItem(value: 'USD', child: Text('USD (\$)')),
                                        DropdownMenuItem(value: 'EUR', child: Text('EUR (€)')),
                                        DropdownMenuItem(value: 'GBP', child: Text('GBP (£)')),
                                        DropdownMenuItem(value: 'CAD', child: Text('CAD (\$)')),
                                      ],
                                      onChanged: (String? newValue) {
                                        if (newValue != null) {
                                          setState(() {
                                            _currencyCode = newValue;
                                          });
                                        }
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Security Shield Banner Card
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFF1F5F9)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF009048).withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.verified_user_rounded,
                                color: Color(0xFF009048),
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: const [
                                  Text(
                                    'Your information is secure',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF0A2540),
                                      fontSize: 14,
                                    ),
                                  ),
                                  SizedBox(height: 3),
                                  Text(
                                    'We never share your personal information with anyone.',
                                    style: TextStyle(
                                      color: Color(0xFF718096),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Opacity(
                              opacity: 0.2,
                              child: Icon(
                                Icons.lock_outline_rounded,
                                color: Color(0xFF009048),
                                size: 32,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Save Changes Action Button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: isLoading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF009048),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 0,
                          ),
                          child: isLoading
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : const Text(
                                  'Save Changes',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }
}
