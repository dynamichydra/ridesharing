/// Result of `ride:accept` — mirrors `ride:accept_ok` / `ride:accept_error`.
sealed class RideAcceptResult {
  const RideAcceptResult();
}

class RideAcceptSucceeded extends RideAcceptResult {
  final String rideId;
  final String status;
  const RideAcceptSucceeded({required this.rideId, required this.status});
}

class RideAcceptFailed extends RideAcceptResult {
  final String message;
  const RideAcceptFailed(this.message);
}
