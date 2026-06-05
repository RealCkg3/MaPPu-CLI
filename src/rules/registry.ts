/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DoctorRule {
  id: string;
  name: string;
  category: string;
  check: (file: { filePath: string; content: string }) => {
    success: boolean;
    issues: { line: number; description: string; remediation: string }[];
  };
}

export class RulesRegistry {
  private rules: Map<string, DoctorRule> = new Map();

  public register(rule: DoctorRule): void {
    this.rules.set(rule.id, rule);
  }

  public getAll(): DoctorRule[] {
    return Array.from(this.rules.values());
  }

  public runAll(file: { filePath: string; content: string }): any[] {
    const results: any[] = [];
    this.rules.forEach(rule => {
      const result = rule.check(file);
      if (!result.success) {
        results.push({
          ruleId: rule.id,
          name: rule.name,
          category: rule.category,
          issues: result.issues
        });
      }
    });
    return results;
  }
}
