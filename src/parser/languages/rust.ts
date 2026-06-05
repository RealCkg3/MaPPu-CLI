/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const languageId = "rust";
export const queries = {
  classes: "(struct_item name: (type_identifier) @struct.name)",
  functions: "(function_item name: (identifier) @function.name)",
};
