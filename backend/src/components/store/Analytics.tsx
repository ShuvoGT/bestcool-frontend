"use client";

/**
 * Injects Facebook Pixel + GA4 scripts on the storefront, ONLY when an ID is
 * present (spec §13). Changing the ID in admin needs no redeploy — it's read
 * from public settings at request time. Never rendered on /admin (this lives
 * in the storefront layout). Fires PageView on each client route change.
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { analytics } from "@/lib/analytics";

export function Analytics({ pixelId, ga4Id }: { pixelId?: string | null; ga4Id?: string | null }) {
  const pathname = usePathname();
  const firstLoad = useRef(true);

  // First-party funnel page view fires on EVERY navigation including the first
  // load (so single-page sessions are counted). The GA/Pixel PageView skips the
  // first run because the base snippets already send the initial page_view.
  useEffect(() => {
    analytics.firstPartyPageView();
    if (firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    analytics.pageView();
  }, [pathname]);

  return (
    <>
      {pixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      )}

      {ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${ga4Id}');`}
          </Script>
        </>
      )}
    </>
  );
}
