import { pgTable, uuid, text, numeric, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] })
    .notNull()
    .default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mpesaPayments = pgTable("mpesa_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source", { enum: ["stk_push", "c2b_till"] })
    .notNull()
    .default("stk_push"),
  status: text("status", { enum: ["Pending", "Success", "Failed", "Cancelled"] })
    .notNull()
    .default("Pending"),
  phone: text("phone").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  businessShortcode: text("business_shortcode"),
  tillNumber: text("till_number"),
  merchantRequestId: text("merchant_request_id"),
  checkoutRequestId: text("checkout_request_id").unique(),
  mpesaReceiptNumber: text("mpesa_receipt_number").unique(),
  resultCode: integer("result_code"),
  resultDesc: text("result_desc"),
  accountReference: text("account_reference"),
  transactionDesc: text("transaction_desc"),
  rawRequestJson: jsonb("raw_request_json").$type<Record<string, unknown>>(),
  rawCallbackJson: jsonb("raw_callback_json").$type<Record<string, unknown>>(),
  initiatedBy: uuid("initiated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type MpesaPayment = typeof mpesaPayments.$inferSelect;
