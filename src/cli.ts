#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as dotenv from "dotenv";
import { runCLI } from "./cli/index";

dotenv.config();

runCLI(process.argv.slice(2));
