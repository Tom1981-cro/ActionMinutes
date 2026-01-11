import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface GeoData {
  countryCode: string | null;
  isEU: boolean;
  currency: "EUR" | "USD";
  pricingTableId: string | null;
  publishableKey: string | null;
}

interface StripePricingTableProps {
  className?: string;
  clientReferenceId?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "stripe-pricing-table": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "pricing-table-id"?: string;
          "publishable-key"?: string;
          "client-reference-id"?: string;
        },
        HTMLElement
      >;
    }
  }
}

export function useGeoData() {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGeo = async () => {
      try {
        const localeCheck = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const isEuropeTimezone = localeCheck?.startsWith("Europe/");
        
        const response = await fetch("/api/geo");
        if (response.ok) {
          const data = await response.json();
          if (!data.countryCode && isEuropeTimezone) {
            data.isEU = true;
            data.currency = "EUR";
          }
          setGeoData(data);
        } else {
          setGeoData({
            countryCode: null,
            isEU: isEuropeTimezone,
            currency: isEuropeTimezone ? "EUR" : "USD",
            pricingTableId: null,
            publishableKey: null,
          });
        }
      } catch {
        const isEuropeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone?.startsWith("Europe/");
        setGeoData({
          countryCode: null,
          isEU: isEuropeTimezone || false,
          currency: isEuropeTimezone ? "EUR" : "USD",
          pricingTableId: null,
          publishableKey: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGeo();
  }, []);

  return { geoData, loading };
}

export function formatPrice(amount: number, currency: "EUR" | "USD"): string {
  if (currency === "EUR") {
    return `€${amount}`;
  }
  return `$${amount}`;
}

export function StripePricingTable({ className, clientReferenceId }: StripePricingTableProps) {
  const { geoData, loading } = useGeoData();

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ""}`}>
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!geoData?.pricingTableId || !geoData?.publishableKey) {
    return (
      <div className={`text-center py-8 text-white/50 ${className || ""}`}>
        <p>Pricing information is currently unavailable.</p>
        <p className="text-sm mt-2">Please try again later or contact support.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <stripe-pricing-table
        pricing-table-id={geoData.pricingTableId}
        publishable-key={geoData.publishableKey}
        client-reference-id={clientReferenceId}
      />
    </div>
  );
}
