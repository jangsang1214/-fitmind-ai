/* GARANG external service endpoints.
   Keep provider secrets on the server. Browser code should only receive public HTTPS endpoints.
   null means the feature remains in verified development/fallback mode and must not claim provider success. */
window.GARANG_SERVICES = Object.freeze({
  coachEndpoint: null,          // n8n / GARANG AI Gateway POST {message, context}
  mealScanEndpoint: null,       // Vision gateway POST multipart/form-data image -> {items:[...]}
  analyticsEndpoint: null,      // optional first-party event collector
  paymentCheckoutEndpoint: null,
  paymentEntitlementEndpoint: null
});
