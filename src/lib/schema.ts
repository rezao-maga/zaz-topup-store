import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  // Hash SHA-256 dari token, bukan token mentah: kalau DB bocor, isi kolom
  // ini tidak bisa dipakai untuk memverifikasi akun orang lain.
  // ponytail: satu token aktif per user (kolom di users, bukan tabel terpisah);
  // pindah ke tabel sendiri kalau nanti butuh multi-token (reset password dll).
  verifyTokenHash: text("verify_token_hash"),
  verifyTokenExpires: timestamp("verify_token_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  game: text("game").notNull(),
  category: text("category").notNull(),
  label: text("label").notNull(),
  diamonds: integer("diamonds"),
  bonus: text("bonus"),
  price: integer("price").notNull(),
  originalPrice: integer("original_price"),
  discount: integer("discount"),
  popular: boolean("popular").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;