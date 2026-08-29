/*
  فرتكه — إعداد الدفع
  لا تضع PAYMOB_SECRET_KEY أو PAYMOB_HMAC_SECRET هنا أبدًا.
  المفاتيح الحساسة مكانها Supabase Edge Functions Secrets.
*/
window.FARTAKA_PAYMENT_CONFIG={
  enabled:true,
  provider:'paymob',
  checkout_endpoint:'https://kycvxqjjdkoatemjxaoz.supabase.co/functions/v1/create-paymob-intention',
  currency:'EGP'
};
