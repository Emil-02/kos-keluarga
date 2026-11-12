import type { Database } from "@/types/database";

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Settings = Tables<"settings">;
export type Room = Tables<"rooms">;
export type Booking = Tables<"bookings">;
export type Tenancy = Tables<"tenancies">;
export type Invoice = Tables<"invoices">;
export type Payment = Tables<"payments">;
export type Profile = Tables<"profiles">;
export type Complaint = Tables<"complaints">;
export type Announcement = Tables<"announcements">;
export type Facility = Tables<"facilities">;
export type Testimonial = Tables<"testimonials">;
export type GalleryItem = Tables<"gallery">;
export type Expense = Tables<"expenses">;

export type RentPeriod = Enums<"rent_period">;
export type InvoiceStatus = Enums<"invoice_status">;
export type BookingStatus = Enums<"booking_status">;
export type PaymentMethod = Enums<"payment_method">;
export type ComplaintStatus = Enums<"complaint_status">;

/** Hasil standar Server Action untuk dipakai dengan useActionState. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
};
