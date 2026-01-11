import { useEffect, useState, useRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && geoData?.pricingTableId && geoData?.publishableKey) {
      containerRef.current.innerHTML = "";
      const table = document.createElement("stripe-pricing-table");
      table.setAttribute("pricing-table-id", geoData.pricingTableId);
      table.setAttribute("publishable-key", geoData.publishableKey);
      if (clientReferenceId) {
        table.setAttribute("client-reference-id", clientReferenceId);
      }
      containerRef.current.appendChild(table);
    }
  }, [geoData, clientReferenceId]);

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

  return <div ref={containerRef} className={className} />;
}
