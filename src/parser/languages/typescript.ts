/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const languageId = "typescript";
export const queries = {
  classes: "(class_declaration name: (type_identifier) @class.name)",
  functions: "(function_declaration name: (identifier) @function.name)",
};
