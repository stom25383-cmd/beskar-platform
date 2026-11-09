import "server-only";
import { env } from "../env";
import type { Repo } from "./repo";
import { localRepo } from "./local";
import { firebaseRepo } from "./firebase";

/** Selected persistence driver for this deployment. */
export const repo: Repo = env.driver === "firebase" ? firebaseRepo : localRepo;

export type { Repo } from "./repo";
