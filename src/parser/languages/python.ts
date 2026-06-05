/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const languageId = "python";
export const queries = {
  classes: "(class_definition name: (identifier) @class.name)",
  functions: "(function_definition name: (identifier) @function.name)",
};
