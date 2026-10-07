import { createDb, createServices } from "@mem/db";
import "./env";

export const { db, pool } = createDb();
export const services = createServices(db);
