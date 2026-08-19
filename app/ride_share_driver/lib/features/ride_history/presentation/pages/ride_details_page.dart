import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:go_router/go_router.dart';

class RideDetailsPage extends StatefulWidget {
  final Map<String, dynamic>? rideData;
  const RideDetailsPage({super.key, this.rideData});

  @override
  State<RideDetailsPage> createState() => _RideDetailsPageState();
}

class _RideDetailsPageState extends State<RideDetailsPage> {
  final LatLng _pickup = const LatLng(12.9352, 77.6245); // Koramangala
  final LatLng _drop = const LatLng(12.8452, 77.6602); // Electronic City

  @override
  Widget build(BuildContext context) {
    final data = widget.rideData ?? {};
    final String dateStr = data['date']?.toString() ?? '18 May 2025, 07:45 AM';
    final String vehicleName = data['vehicle']?.toString() ?? 'Ryva Cab';
    final String pickup = data['pickup']?.toString() ?? 'Koramangala, Bengaluru';
    final String drop = data['drop']?.toString() ?? 'Electronic City, Bengaluru';
    final String distance = data['distance']?.toString() ?? '6.2 km';
    final String time = data['time']?.toString() ?? '18 min';
    final double fare = (data['fare'] as num?)?.toDouble() ?? 125.0;

    final double baseFare = (fare * 0.40).clamp(20.0, fare);
    final double distanceFare = (fare * 0.48).clamp(10.0, fare);
    final double timeFare = (fare - baseFare - distanceFare).clamp(0.0, fare);

    final Set<Marker> markers = {
      Marker(
        markerId: const MarkerId('pickup'),
        position: _pickup,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
      ),
      Marker(
        markerId: const MarkerId('drop'),
        position: _drop,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      ),
    };

    final Set<Polyline> polylines = {
      Polyline(
        polylineId: const PolylineId('route'),
        points: [_pickup, const LatLng(12.8900, 77.6400), _drop],
        color: const Color(0xFF009048),
        width: 4,
      ),
    };

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
          'Ride Details',
          style: TextStyle(
            color: Color(0xFF021B47),
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Interactive Route Map
            SizedBox(
              height: 220,
              width: double.infinity,
              child: GoogleMap(
                initialCameraPosition: CameraPosition(
                  target: LatLng((_pickup.latitude + _drop.latitude) / 2, (_pickup.longitude + _drop.longitude) / 2),
                  zoom: 12.0,
                ),
                markers: markers,
                polylines: polylines,
                zoomControlsEnabled: false,
                myLocationButtonEnabled: false,
              ),
            ),

            // 2. Summary Card
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        dateStr,
                        style: const TextStyle(fontSize: 13, color: Color(0xFF8A94A6)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F4EA),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Completed',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  Row(
                    children: [
                      const Icon(Icons.directions_car_filled_rounded, color: Color(0xFF021B47), size: 20),
                      const SizedBox(width: 8),
                      Text(
                        vehicleName,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Route Addresses
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Column(
                        children: [
                          const Icon(Icons.circle, color: Color(0xFF009048), size: 10),
                          Container(height: 22, width: 2, color: Colors.grey.shade300),
                          const Icon(Icons.circle, color: Color(0xFFE53935), size: 10),
                        ],
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              pickup,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47)),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              drop,
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Divider(),
                  const SizedBox(height: 12),

                  // Stats Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatColumn('Distance', distance),
                      _buildStatDivider(),
                      _buildStatColumn('Time', time),
                      _buildStatDivider(),
                      _buildStatColumn('Earnings', '₹${fare.toStringAsFixed(0)}'),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const Divider(),
                  const SizedBox(height: 16),

                  // Fare Breakdown
                  const Text(
                    'Fare Breakdown',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                  ),
                  const SizedBox(height: 12),
                  _buildFareRow('Base Fare', '₹${baseFare.toStringAsFixed(0)}'),
                  _buildFareRow('Distance Fare ($distance)', '₹${distanceFare.toStringAsFixed(0)}'),
                  _buildFareRow('Time Fare ($time)', '₹${timeFare.toStringAsFixed(0)}'),
                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 10),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Earnings',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                      ),
                      Text(
                        '₹${fare.toStringAsFixed(0)}',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF009048)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatColumn(String label, String val) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF8A94A6))),
        const SizedBox(height: 4),
        Text(val, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
      ],
    );
  }

  Widget _buildStatDivider() {
    return Container(width: 1, height: 24, color: Colors.grey.shade200);
  }

  Widget _buildFareRow(String label, String val) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF8A94A6))),
          Text(val, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF021B47))),
        ],
      ),
    );
  }
}
