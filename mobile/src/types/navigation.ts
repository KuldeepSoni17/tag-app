export type AuthStackParamList = {
  Phone: undefined;
  Otp: { phone: string };
  Register: { phone: string; otp: string };
};
