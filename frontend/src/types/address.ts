export interface AddressValue {
  /** Street / building line (optional). */
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export type AddressErrors = Partial<Record<keyof AddressValue, string>>;
