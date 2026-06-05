/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const languageId = "go";
export const queries = {
  classes: "(type_spec name: (type_identifier) @type.name)",
  functions: "(function_declaration name: (identifier) @function.name)",
};
