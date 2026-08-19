import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class VehicleInfoPage extends StatelessWidget {
  const VehicleInfoPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF021B47), size: 20),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          'Vehicle Information',
          style: TextStyle(
            color: Color(0xFF021B47),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: Color(0xFF021B47), size: 22),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          children: [
            // 1. Hero Vehicle Card with Image
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E7E9)),
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 100,
                    height: 70,
                    child: Image.asset(
                      'assets/icons/bike.png',
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: 70,
                        height: 70,
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F4EA),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.two_wheeler_rounded, color: Color(0xFF009048), size: 36),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Hero Splendor+',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF021B47),
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'KA 01 AB 1234',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF8A94A6),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE6F4EA),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.check_rounded, color: Color(0xFF009048), size: 14),
                              SizedBox(width: 4),
                              Text(
                                'Verified',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF009048),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // 2. Details Card
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E7E9)),
              ),
              child: Column(
                children: [
                  _buildDetailRow('Vehicle Type', 'Bike'),
                  const Divider(),
                  _buildDetailRow('Model', 'Hero Splendor+'),
                  const Divider(),
                  _buildDetailRow('Color', 'Black'),
                  const Divider(),
                  _buildDetailRow('Registration Number', 'KA 01 AB 1234'),
                  const Divider(),
                  _buildDetailRow('Insurance Validity', '24 Oct 2025'),
                  const Divider(),
                  _buildDetailRow('PUC Validity', '18 Sep 2025'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 13, color: Color(0xFF8A94A6), fontWeight: FontWeight.w500),
          ),
          Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
          ),
        ],
      ),
    );
  }
}
