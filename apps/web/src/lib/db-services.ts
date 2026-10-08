import { createServices } from "@mem/db";
import { db } from "./db";

/** Server-side services for API routes. */
export const services = createServices(db);
