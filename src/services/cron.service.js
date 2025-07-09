import cron from "node-cron";

import { deleteOldFiles } from "./file.service.js";

cron.schedule("*/5 * * * *", deleteOldFiles); // runs every 5 mins
