import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/constants.dart';
import '../../../../core/widgets/custom_button.dart';
import '../../../../core/widgets/custom_text_field.dart';
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

  void _submit() {
    if (_formKey.currentState!.validate()) {
      context.read<ProfileBloc>().add(
            UpdateProfileDetails(
              name: _nameController.text.trim(),
              email: _emailController.text.trim(),
              phone: _phoneController.text.trim(),
            ),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.background,
      appBar: AppBar(
        title: const Text('Edit Profile'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<ProfileBloc, ProfileState>(
        listener: (context, state) {
          if (state is ProfileUpdateSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Profile updated successfully!'),
                backgroundColor: AppColors.successGreen,
              ),
            );
            context.pop();
          } else if (state is ProfileError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: theme.colorScheme.error,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is ProfileLoading && !_initialized) {
            return const LoadingView();
          }

          if (state is ProfileLoaded) {
            if (!_initialized) {
              _nameController = TextEditingController(text: state.userProfile['name'] as String? ?? '');
              _emailController = TextEditingController(text: state.userProfile['email'] as String? ?? '');
              _phoneController = TextEditingController(text: state.userProfile['phone'] as String? ?? '');
              _initialized = true;
            }

            final isLoading = state is ProfileLoading;

            return SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.l),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      Center(
                        child: Stack(
                          children: [
                            CircleAvatar(
                              radius: 54,
                              backgroundImage: NetworkImage(
                                state.userProfile['profile_picture'] as String? ??
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
                              ),
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                padding: const EdgeInsets.all(6),
                                decoration: const BoxDecoration(
                                  color: AppColors.primaryBlue,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.camera_alt_rounded,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      CustomTextField(
                        controller: _nameController,
                        labelText: 'Full Name',
                        prefixIcon: Icons.person_outline_rounded,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter your name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.m),
                      CustomTextField(
                        controller: _emailController,
                        labelText: 'Email Address',
                        prefixIcon: Icons.email_outlined,
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter your email';
                          }
                          if (!value.contains('@')) {
                            return 'Please enter a valid email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.m),
                      CustomTextField(
                        controller: _phoneController,
                        labelText: 'Phone Number',
                        prefixIcon: Icons.phone_outlined,
                        keyboardType: TextInputType.phone,
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Please enter your phone number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      CustomButton(
                        text: 'Save Changes',
                        onPressed: _submit,
                        isLoading: isLoading,
                      ),
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
