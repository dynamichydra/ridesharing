import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../constants/constants.dart';

class LoadingView extends StatelessWidget {
  final bool isList;
  const LoadingView({super.key, this.isList = false});

  @override
  Widget build(BuildContext context) {
    if (isList) {
      return ListView.builder(
        itemCount: 5,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.m),
        itemBuilder: (context, index) {
          final isLight = Theme.of(context).brightness == Brightness.light;
          return Shimmer.fromColors(
            baseColor: isLight ? Colors.grey[300]! : Colors.grey[850]!,
            highlightColor: isLight ? Colors.grey[100]! : Colors.grey[700]!,
            child: Card(
              margin: const EdgeInsets.only(bottom: AppSpacing.m),
              child: Container(
                height: 80,
                padding: const EdgeInsets.all(AppSpacing.m),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.m),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: double.infinity,
                            height: 12,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(AppRadius.s),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.s),
                          Container(
                            width: 150,
                            height: 10,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(AppRadius.s),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    }

    return const Center(
      child: CircularProgressIndicator(),
    );
  }
}
