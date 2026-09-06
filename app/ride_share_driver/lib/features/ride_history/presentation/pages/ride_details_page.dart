import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:go_router/go_router.dart';
import '../../../../config/map_config.dart';

class RideDetailsPage extends StatefulWidget {
  final Map<String, dynamic>? rideData;
  const RideDetailsPage({super.key, this.rideData});

  @override
  State<RideDetailsPage> createState() => _RideDetailsPageState();
}

class _RideDetailsPageState extends State<RideDetailsPage> {
  late LatLng _pickup;
  late LatLng _drop;

  @override
  void initState() {
    super.initState();
    final data = widget.rideData ?? {};
    final pLat = double.tryParse(data['pickupLat']?.toString() ?? '') ?? 12.9352;
    final pLng = double.tryParse(data['pickupLng']?.toString() ?? '') ?? 77.6245;
    final dLat = double.tryParse(data['dropLat']?.toString() ?? '') ?? 12.8452;
    final dLng = double.tryParse(data['dropLng']?.toString() ?? '') ?? 77.6602;
    _pickup = LatLng(pLat, pLng);
    _drop = LatLng(dLat, dLng);
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.rideData ?? {};
    final String dateStr = data['date']?.toString() ?? '18 May 2025, 07:45 AM';
    final String vehicleName = data['vehicle']?.toString() ?? data['vehicleTypeName']?.toString() ?? 'Ryva Cab';
    final String pickup = data['pickup']?.toString() ?? data['pickupAddress']?.toString() ?? 'Pickup location';
    final String drop = data['drop']?.toString() ?? data['dropAddress']?.toString() ?? 'Drop location';
    final String distance = data['distance']?.toString() ?? '${data['actualDistanceKm'] ?? data['distanceKm'] ?? '0.0'} km';
    final String time = data['time']?.toString() ?? '${data['actualDurationMin'] ?? data['durationMin'] ?? 20} min';
    final double fare = (data['fare'] as num?)?.toDouble() ??
        ((data['finalFareMinor'] ?? data['estimatedFareMinor'] as num?)?.toDouble() ?? 0) / 100.0;
    final String statusStr = (data['status']?.toString() ?? 'Completed').toUpperCase();
    final bool isCancelled = statusStr == 'CANCELLED';

    final double baseFare = (fare * 0.40).clamp(0.0, fare);
    final double distanceFare = (fare * 0.48).clamp(0.0, fare);
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
                mapId: MapConfig.cloudMapId,
                style: MapConfig.uberSilver,
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
                          color: isCancelled ? const Color(0xFFFEE2E2) : const Color(0xFFE6F4EA),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          isCancelled ? 'Cancelled' : 'Completed',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isCancelled ? const Color(0xFFEF4444) : const Color(0xFF009048),
                          ),
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
