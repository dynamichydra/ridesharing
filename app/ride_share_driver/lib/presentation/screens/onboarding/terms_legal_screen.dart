import 'package:flutter/material.dart';
import 'package:flutter_html/flutter_html.dart';
import '../../../style/appcolors.dart';
import 'widgets/three_dots_loader.dart';

class _LegalContent {
  final String? terms;
  final String? privacy;
  const _LegalContent({required this.terms, required this.privacy});

  bool get isEmpty => terms == null && privacy == null;
}

class TermsLegalScreen extends StatefulWidget {
  final String? termsUrl;
  final String? privacyUrl;
  final bool isAlreadyAccepted;
  final bool isLoading;
  final VoidCallback onAccepted;
  final Future<String> Function(String url) fetchContent;

  const TermsLegalScreen({
    super.key,
    required this.termsUrl,
    required this.privacyUrl,
    this.isAlreadyAccepted = false,
    this.isLoading = false,
    required this.onAccepted,
    required this.fetchContent,
  });

  @override
  State<TermsLegalScreen> createState() => _TermsLegalScreenState();
}

class _TermsLegalScreenState extends State<TermsLegalScreen> {
  late bool _scrolledToEnd;
  final ScrollController _scrollController = ScrollController();
  late Future<_LegalContent> _contentFuture;

  @override
  void initState() {
    super.initState();
    _scrolledToEnd = widget.isAlreadyAccepted;
    _scrollController.addListener(_handleScroll);
    _contentFuture = _loadContent();
  }

  Future<_LegalContent> _loadContent() async {
    final results = await Future.wait([
      _fetchOrNull(widget.termsUrl),
      _fetchOrNull(widget.privacyUrl),
    ]);
    return _LegalContent(terms: results[0], privacy: results[1]);
  }

  Future<String?> _fetchOrNull(String? url) {
    if (url == null || url.isEmpty) return Future.value(null);
    return widget.fetchContent(url);
  }

  void _handleScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 20) {
      if (!_scrolledToEnd) {
        setState(() {
          _scrolledToEnd = true;
        });
      }
    }
  }

  void _retry() {
    setState(() {
      _contentFuture = _loadContent();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          color: AppColors.surface,
          child: const Text(
            'Terms & Privacy Policy',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: AppColors.textPrimary,
            ),
            textAlign: TextAlign.center,
          ),
        ),
        Expanded(
          child: FutureBuilder<_LegalContent>(
            future: _contentFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snapshot.hasError) {
                return _buildMessage(
                  'Failed to load the document. Check your connection and try again.',
                  showRetry: true,
                );
              }
              final content = snapshot.data!;
              if (content.isEmpty) {
                return _buildMessage(
                  'No terms or privacy policy is configured yet. Please contact support.',
                  showRetry: false,
                );
              }
              return SingleChildScrollView(
                controller: _scrollController,
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (content.terms != null) ...[
                      const Text(
                        'Terms of Service',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Html(data: content.terms!),
                      const SizedBox(height: 24),
                    ],
                    if (content.privacy != null) ...[
                      const Text(
                        'Privacy Policy',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Html(data: content.privacy!),
                    ],
                  ],
                ),
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(24),
          child: ElevatedButton(
            onPressed: (_scrolledToEnd && !widget.isLoading) ? widget.onAccepted : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: _scrolledToEnd ? AppColors.primary : Colors.grey,
            ),
            child: widget.isLoading
                ? const ThreeDotsLoader()
                : Text(
                    _scrolledToEnd ? 'I Agree & Continue' : 'Scroll down to read',
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildMessage(String message, {required bool showRetry}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: AppColors.error,
              size: 40,
            ),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            if (showRetry) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _retry,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                ),
                child: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
