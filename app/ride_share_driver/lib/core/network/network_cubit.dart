import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../config/api_config.dart';

abstract class NetworkState {}

class NetworkConnected extends NetworkState {}

class NetworkDisconnected extends NetworkState {}

class NetworkChecking extends NetworkState {}

class NetworkCubit extends Cubit<NetworkState> {
  final Connectivity _connectivity;
  StreamSubscription<ConnectivityResult>? _subscription;

  NetworkCubit({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity(),
        super(NetworkConnected()) {
    _init();
  }

  void _init() {
    checkConnection();
    try {
      _subscription = _connectivity.onConnectivityChanged.listen((result) {
        _handleConnectivityResult(result);
      });
    } catch (_) {
      // If stream subscription fails on an unsupported platform or during hot-reload,
      // maintain connected state so the user is not blocked.
    }
  }

  Future<void> _handleConnectivityResult(ConnectivityResult result) async {
    if (result == ConnectivityResult.none) {
      // Interface is completely down (airplane mode, disabled wifi & cellular)
      // Check reachability one more time before showing blocking screen
      final isOnline = await _hasRealInternetAccess();
      if (!isOnline) {
        emit(NetworkDisconnected());
        return;
      }
    }

    // Active network interface (WiFi, Mobile, Ethernet, VPN, etc.)
    // Mark as connected so the user is never falsely locked out
    emit(NetworkConnected());

    // Non-blocking background verification
    final isOnline = await _hasRealInternetAccess();
    if (!isOnline && state is! NetworkDisconnected) {
      // Only disconnect if connectivity is actually confirmed dead
      final currentResult = await _safeCheckConnectivity();
      if (currentResult == ConnectivityResult.none) {
        emit(NetworkDisconnected());
      }
    }
  }

  Future<ConnectivityResult> _safeCheckConnectivity() async {
    try {
      return await _connectivity.checkConnectivity();
    } catch (_) {
      return ConnectivityResult.other;
    }
  }

  /// Multi-strategy reachability check:
  /// 1. Direct raw IP socket test to public DNS servers (8.8.8.8, 1.1.1.1) - bypasses DNS entirely.
  /// 2. DNS lookup to reliable domains and app's backend host.
  /// 3. Fallback HTTP head check if sockets/DNS are restricted by proxy/firewall.
  Future<bool> _hasRealInternetAccess() async {
    // Strategy 1: Direct socket connection to public IP on port 53 (ultra-fast, no DNS dependency)
    for (final ip in ['8.8.8.8', '1.1.1.1']) {
      try {
        final socket = await Socket.connect(ip, 53, timeout: const Duration(seconds: 3));
        socket.destroy();
        return true;
      } catch (_) {}
    }

    // Strategy 2: DNS lookup to reliable domains and app's backend host
    final hostsToCheck = <String>[
      'google.com',
      'cloudflare.com',
      'one.one.one.one',
    ];
    try {
      final backendUri = Uri.tryParse(ApiConfig.baseUrl);
      if (backendUri != null && backendUri.host.isNotEmpty) {
        hostsToCheck.insert(0, backendUri.host);
      }
    } catch (_) {}

    for (final host in hostsToCheck) {
      try {
        final result = await InternetAddress.lookup(host)
            .timeout(const Duration(seconds: 4));
        if (result.isNotEmpty && result[0].rawAddress.isNotEmpty) {
          return true;
        }
      } catch (_) {}
    }

    // Strategy 3: Fast HTTP check (useful behind corporate proxies / firewalls blocking raw sockets)
    try {
      final client = HttpClient()..connectionTimeout = const Duration(seconds: 4);
      final request = await client.getUrl(Uri.parse('https://www.google.com/generate_204'));
      final response = await request.close();
      client.close();
      if (response.statusCode >= 200 && response.statusCode < 400) {
        return true;
      }
    } catch (_) {}

    return false;
  }

  Future<void> checkConnection() async {
    if (state is NetworkDisconnected) {
      emit(NetworkChecking());
    }
    try {
      final result = await _safeCheckConnectivity();
      if (result == ConnectivityResult.none) {
        final isOnline = await _hasRealInternetAccess();
        if (isOnline) {
          emit(NetworkConnected());
        } else {
          emit(NetworkDisconnected());
        }
      } else {
        // Active interface exists
        emit(NetworkConnected());
      }
    } catch (_) {
      // If check fails unexpectedly, do not block the driver; assume connected
      emit(NetworkConnected());
    }
  }

  /// Explicit user override to dismiss the no-internet view and proceed
  void forceConnected() {
    emit(NetworkConnected());
  }

  @override
  Future<void> close() {
    _subscription?.cancel();
    return super.close();
  }
}
