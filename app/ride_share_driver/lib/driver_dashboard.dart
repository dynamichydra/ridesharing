import 'dart:async';
import 'package:flutter/material.dart';
import 'style/appcolors.dart';

class DriverDashboard extends StatefulWidget {
  final VoidCallback onLogout;
  const DriverDashboard({super.key, required this.onLogout});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  bool _isOnline = false;
  double _todayEarnings = 1850.50;
  int _todayTrips = 8;
  double _onlineHours = 6.5;

  // Ride Request state
  bool _showIncomingRequest = false;
  int _secondsLeft = 15;
  Timer? _countdownTimer;

  // Active Ride Navigation simulation state
  bool _isNavigating = false;
  String _navigationTitle = 'Heading to Pickup';
  String _navigationSubtitle = 'Pick up Jane Smith at Vasanth Nagar, Bengaluru';
  String _actionButtonText = 'I Have Arrived';
  int _navigationStep = 0;
  Timer? _navigationProgressTimer;

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _navigationProgressTimer?.cancel();
    super.dispose();
  }

  void _simulateIncomingRequest() {
    if (!_isOnline) return;
    _countdownTimer?.cancel();
    setState(() {
      _showIncomingRequest = true;
      _secondsLeft = 15;
    });

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft > 1) {
        setState(() {
          _secondsLeft--;
        });
      } else {
        _declineRequest();
      }
    });
  }

  void _declineRequest() {
    _countdownTimer?.cancel();
    setState(() {
      _showIncomingRequest = false;
    });
  }

  void _acceptRequest() {
    _countdownTimer?.cancel();
    setState(() {
      _showIncomingRequest = false;
      _isNavigating = true;
      _navigationTitle = 'Heading to Pickup';
      _navigationSubtitle = 'Pick up Jane Smith at Vasanth Nagar, Bengaluru';
      _actionButtonText = 'I Have Arrived';
      _navigationStep = 0;
    });

    // Simulate automatic driver vehicle movement progress
    _navigationProgressTimer?.cancel();
    _navigationProgressTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      setState(() {
        _navigationStep++;
        if (_navigationStep == 2) {
          _navigationTitle = 'Arrived at Pickup';
          _navigationSubtitle = 'Waiting for Jane Smith. Tell them you have arrived.';
          _actionButtonText = 'Start Trip';
        } else if (_navigationStep == 4) {
          _navigationTitle = 'Trip in Progress';
          _navigationSubtitle = 'Navigating to Indiranagar Metro Station, Bengaluru';
          _actionButtonText = 'Complete Trip';
        } else if (_navigationStep >= 6) {
          timer.cancel();
          _completeTrip();
        }
      });
    });
  }

  void _advanceNavigation() {
    setState(() {
      if (_navigationStep < 2) {
        _navigationStep = 2;
        _navigationTitle = 'Arrived at Pickup';
        _navigationSubtitle = 'Waiting for Jane Smith. Tell them you have arrived.';
        _actionButtonText = 'Start Trip';
      } else if (_navigationStep < 4) {
        _navigationStep = 4;
        _navigationTitle = 'Trip in Progress';
        _navigationSubtitle = 'Navigating to Indiranagar Metro Station, Bengaluru';
        _actionButtonText = 'Complete Trip';
      } else {
        _navigationProgressTimer?.cancel();
        _completeTrip();
      }
    });
  }

  void _completeTrip() {
    _navigationProgressTimer?.cancel();
    setState(() {
      _isNavigating = false;
      _todayEarnings += 185.00;
      _todayTrips += 1;
    });

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle_rounded, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Trip Completed!'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Passenger: Jane Smith'),
            Text('Fare Collected: ₹185.00'),
            Text('Distance: 5.8 km'),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(context),
            child: const Text('Confirm'),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text('Driver Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textPrimary,
        actions: [
          Row(
            children: [
              Text(
                _isOnline ? 'ONLINE' : 'OFFLINE',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: _isOnline ? AppColors.primary : AppColors.error,
                ),
              ),
              Switch(
                value: _isOnline,
                activeColor: AppColors.primary,
                onChanged: (val) {
                  setState(() {
                    _isOnline = val;
                    if (!_isOnline) {
                      _isNavigating = false;
                      _navigationProgressTimer?.cancel();
                    }
                  });
                },
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      drawer: _buildDrawer(context),
      body: Stack(
        children: [
          // Main Body Dashboard Content
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Warning banner if offline
                if (!_isOnline)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withOpacity(0.1),
                      border: Border.all(color: AppColors.warning),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.warning_amber_rounded, color: AppColors.warning),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'You are offline. Go online to start receiving ride requests!',
                            style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Stats Dashboard Grid
                GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 1.4,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  children: [
                    _buildStatCard('Earnings Today', '₹$_todayEarnings', Icons.payments_rounded, AppColors.primary),
                    _buildStatCard('Trips Done', '$_todayTrips', Icons.directions_car_rounded, AppColors.secondary),
                    _buildStatCard('Online Hours', '${_onlineHours}h', Icons.access_time_rounded, Colors.orange),
                    _buildStatCard('Avg Rating', '4.88 ★', Icons.star_rounded, AppColors.accent),
                  ],
                ),
                const SizedBox(height: 24),

                // Radar / Navigation Simulation Box
                const Text(
                  'Live Navigation Radar',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                Container(
                  height: 250,
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Simulated radar graphic
                      Icon(Icons.radar_rounded, size: 100, color: AppColors.primary.withOpacity(0.1)),
                      Positioned(
                        child: Text(
                          _isNavigating 
                              ? 'Route simulation active' 
                              : _isOnline ? 'Scanning for passengers...' : 'Radar Offline',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                        ),
                      ),
                      
                      // Show active navigation indicators on radar
                      if (_isNavigating)
                        Positioned(
                          bottom: 12,
                          left: 12,
                          right: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            color: Colors.black87,
                            child: Row(
                              children: [
                                const Icon(Icons.navigation_rounded, color: AppColors.primary, size: 16),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _navigationTitle,
                                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Weekly Performance Chart
                _buildWeeklyPerformanceChart(),
                const SizedBox(height: 24),

                // Simulator Trigger
                if (_isOnline && !_isNavigating) ...[
                  const Divider(),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.secondary),
                    onPressed: _simulateIncomingRequest,
                    icon: const Icon(Icons.notifications_active_rounded),
                    label: const Text('Simulate Booking Request Alert'),
                  ),
                ]
              ],
            ),
          ),

          // Sliding Sheet Modal for Incoming Request
          if (_showIncomingRequest)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, spreadRadius: 5)],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Incoming Booking Request',
                          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            CircularProgressIndicator(
                              value: _secondsLeft / 15.0,
                              strokeWidth: 4,
                              color: AppColors.primary,
                            ),
                            Text('$_secondsLeft', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const CircleAvatar(child: Icon(Icons.person)),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Jane Smith', style: TextStyle(fontWeight: FontWeight.bold)),
                              Text('Rating: 4.9 ★'),
                            ],
                          ),
                        ),
                        Text('₹185.00', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Text('Pickup: Vasanth Nagar, Bengaluru', style: TextStyle(color: AppColors.textSecondary)),
                    const Text('Drop: Indiranagar Metro Station, Bengaluru', style: TextStyle(color: AppColors.textSecondary)),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(foregroundColor: AppColors.error, side: const BorderSide(color: AppColors.error)),
                            onPressed: _declineRequest,
                            child: const Text('Decline'),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                            onPressed: _acceptRequest,
                            child: const Text('Accept'),
                          ),
                        ),
                      ],
                    )
                  ],
                ),
              ),
            ),

          // Active Navigation Panel Sheet
          if (_isNavigating)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.only(
                    topLeft: Radius.circular(24),
                    topRight: Radius.circular(24),
                  ),
                  boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 10, spreadRadius: 5)],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      _navigationTitle,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _navigationSubtitle,
                      style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    const LinearProgressIndicator(color: AppColors.primary, backgroundColor: AppColors.border),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                      onPressed: _advanceNavigation,
                      child: Text(_actionButtonText),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
              Icon(icon, color: color, size: 22),
            ],
          ),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        ],
      ),
    );
  }

  Widget _buildWeeklyPerformanceChart() {
    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    final amounts = [1200.0, 1500.0, 1850.50, 0.0, 0.0, 0.0, 0.0];
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Weekly Performance Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary)),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: List.generate(days.length, (index) {
              final double amount = amounts[index];
              final double percent = amount / 1850.50;
              final double barHeight = percent * 80;
              
              return Column(
                children: [
                  Text(amount > 0 ? '₹${amount.toInt()}' : '', style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.textSecondary)),
                  const SizedBox(height: 4),
                  Container(
                    width: 14,
                    height: barHeight > 5 ? barHeight : 5,
                    decoration: BoxDecoration(
                      color: amount > 0 ? AppColors.primary : AppColors.border,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(days[index], style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          const DrawerHeader(
            decoration: BoxDecoration(color: AppColors.primary),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(backgroundColor: Colors.white, child: Icon(Icons.person, color: AppColors.primary)),
                SizedBox(height: 12),
                Text(
                  'Arijit Bose',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Text('Partner Driver', style: TextStyle(color: Colors.white70, fontSize: 13)),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard_rounded, color: AppColors.primary),
            title: const Text('Dashboard'),
            onTap: () => Navigator.pop(context),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: AppColors.error),
            title: const Text('Log Out', style: TextStyle(color: AppColors.error)),
            onTap: () {
              Navigator.pop(context);
              widget.onLogout();
            },
          )
        ],
      ),
    );
  }
}
