import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  Car,
  Receipt,
  Ban,
  UserCheck,
  Pencil,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RiderFormDialog } from "../components/dialog";
import { RiderSubscriptionPanel } from "../components/subscription-panel";
import { WalletPanel } from "@/features/wallets/components/wallet-panel";
import { BankDetailsPanel } from "@/features/bank-details/components/bank-details-panel";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/features/geo/hooks";
import { useRider, useRiderRides, useUpdateRider } from "../hooks";
import { useRidePayments } from "@/features/ride-payments/hooks";

function formatMinor(amountMinor: number | null, currencyCode: string | null): string {
  if (amountMinor == null || !currencyCode) return "—";
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

const RIDE_STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  captured: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  created: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  refunded: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400",
};

export default function RiderDetail() {
  const { riderId } = useParams<{ riderId: string }>();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data, isLoading } = useRider(riderId);
  const rider = data?.MESSAGE?.rider;
  const rideStats = data?.MESSAGE?.rideStats;

  const { data: countriesData } = useCountryOptions();
  const { data: statesData } = useStateOptions(rider?.countryId || undefined);
  const { data: citiesData } = useCityOptions(rider?.stateId || undefined);
  const countryName = countriesData?.MESSAGE?.find((c) => c.id === rider?.countryId)?.name;
  const stateName = statesData?.MESSAGE?.find((s) => s.id === rider?.stateId)?.name;
  const cityName = citiesData?.MESSAGE?.find((c) => c.id === rider?.cityId)?.name;

  const { data: ridesData, isLoading: ridesLoading } = useRiderRides(riderId, 1, 5);
  const rides = ridesData?.MESSAGE ?? [];

  const { data: paymentsData, isLoading: paymentsLoading } = useRidePayments({
    riderId, limit: 5,
  });
  const payments = paymentsData?.MESSAGE ?? [];

  const updateMutation = useUpdateRider();

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading rider…</div>;
  }

  if (!rider || !riderId) {
    return <div className="py-8 text-center text-muted-foreground">Rider not found.</div>;
  }

  const handleToggleVerify = () => {
    updateMutation.mutate({ id: riderId, payload: { isVerified: !rider.isVerified } });
  };

  const handleToggleBlock = () => {
    updateMutation.mutate({ id: riderId, payload: { isBlocked: !rider.isBlocked } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild className="cursor-pointer">
          <Link to="/users">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Riders
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            {rider.name || "Unnamed Rider"}
          </h2>
          <p className="text-muted-foreground mt-1">{rider.phone}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleVerify}
            disabled={updateMutation.isPending}
            className="cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            {rider.isVerified ? "Unverify" : "Verify"}
          </Button>
          <Button
            variant={rider.isBlocked ? "outline" : "destructive"}
            size="sm"
            onClick={handleToggleBlock}
            disabled={updateMutation.isPending}
            className="cursor-pointer"
          >
            <Ban className="h-3.5 w-3.5 mr-1" />
            {rider.isBlocked ? "Unblock" : "Block"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" /> Personal Information
            </CardTitle>
            <CardDescription>Contact details and ride stats on file.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Phone</span>
              <span className="font-medium text-foreground">{rider.phone}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Email</span>
              <span className="font-medium text-foreground">{rider.email || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Rating</span>
              <span className="font-medium text-foreground">★ {rider.rating}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-xs text-muted-foreground block">Total Rides</span>
                <span className="font-medium text-foreground">{rideStats?.totalRides ?? 0}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Completed</span>
                <span className="font-medium text-foreground">{rideStats?.completedRides ?? 0}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Cancelled</span>
                <span className="font-medium text-foreground">{rideStats?.cancelledRides ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" /> Location
              </CardTitle>
              <CardDescription>Registered country/state/city, admin-set.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="cursor-pointer shrink-0"
            >
              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Country</span>
              <span className="font-medium text-foreground">{countryName || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">State</span>
              <span className="font-medium text-foreground">{stateName || "—"}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">City</span>
              <span className="font-medium text-foreground">{cityName || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <WalletPanel ownerType="rider" ownerId={riderId} />

        <BankDetailsPanel ownerType="rider" ownerId={riderId} />

        <RiderSubscriptionPanel riderId={riderId} />

        <Card className="border-border bg-card shadow-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-4 w-4 text-primary" /> Recent Rides
              </CardTitle>
              <CardDescription>Last 5 rides — see the full history for everything.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="cursor-pointer shrink-0">
              <Link to={`/rides?riderId=${riderId}`}>
                View all rides <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {ridesLoading ? (
              <p className="text-sm text-muted-foreground">Loading rides…</p>
            ) : rides.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rides yet.</p>
            ) : (
              <div className="space-y-3">
                {rides.map((ride) => (
                  <div
                    key={ride.id}
                    className="border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {ride.pickupAddress || "Pickup"} → {ride.dropAddress || "Drop"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(ride.requestedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {formatMinor(ride.finalFareMinor ?? ride.estimatedFareMinor, ride.currencyCode)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          RIDE_STATUS_STYLES[ride.status] || "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {ride.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4 text-primary" /> Recent Payments
              </CardTitle>
              <CardDescription>Last 5 ride payments — see the full history for everything.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="cursor-pointer shrink-0">
              <Link to={`/ride-payments?riderId=${riderId}`}>
                View all payments <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading payments…</p>
            ) : payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ride payments yet.</p>
            ) : (
              <div className="space-y-3">
                {payments.map(({ payment, ride }) => (
                  <div
                    key={payment.id}
                    className="border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-foreground">
                        {ride.pickupAddress || "Pickup"} → {ride.dropAddress || "Drop"}
                      </div>
                      <div className="text-xs text-muted-foreground uppercase">
                        via {payment.gateway}
                        {ride.paymentMethod ? ` · ${ride.paymentMethod}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {formatMinor(payment.amountMinor, payment.currencyCode)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          PAYMENT_STATUS_STYLES[payment.status] || PAYMENT_STATUS_STYLES.created
                        }`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RiderFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} rider={rider} />
    </div>
  );
}
