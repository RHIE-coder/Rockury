import { validationSuiteRepository } from '#/repositories';
import { queryService } from './queryService';
import type { IValidationSuite, IValidationRunResult, IValidationCheck, IValidationRule, IQueryResult } from '~/shared/types/db';

function evaluateCheck(check: IValidationCheck, queryResult: IQueryResult): boolean {
  switch (check.type) {
    case 'schema': {
      // Schema check: query should return rows if schema object exists
      if (check.expectedResult) {
        return JSON.stringify(queryResult.rows) === check.expectedResult;
      }
      return queryResult.rowCount > 0;
    }
    case 'data': {
      // Data check: verify row count > 0 or matches expected
      if (check.expectedResult) {
        const expected = Number(check.expectedResult);
        if (!isNaN(expected)) return queryResult.rowCount === expected;
        return JSON.stringify(queryResult.rows) === check.expectedResult;
      }
      return queryResult.rowCount > 0;
    }
    case 'query': {
      // Query check: compare result with expected
      if (check.expectedResult) {
        return JSON.stringify(queryResult.rows) === check.expectedResult;
      }
      return queryResult.rowCount > 0;
    }
    case 'fk': {
      // FK referential integrity check: orphaned rows should be 0
      return queryResult.rowCount === 0;
    }
    default:
      return queryResult.rowCount > 0;
  }
}

export const validationSuiteService = {
  list(): IValidationSuite[] {
    return validationSuiteRepository.list();
  },

  getById(id: string): IValidationSuite | null {
    return validationSuiteRepository.getById(id);
  },

  create(data: { name: string; description: string }): IValidationSuite {
    return validationSuiteRepository.create(data);
  },

  update(id: string, data: Partial<{ name: string; description: string; rules: IValidationRule[] }>): IValidationSuite {
    return validationSuiteRepository.update(id, data);
  },

  deleteById(id: string): void {
    validationSuiteRepository.deleteById(id);
  },

  async runSuite(suiteId: string, connectionId: string): Promise<IValidationRunResult> {
    const suite = validationSuiteRepository.getById(suiteId);
    if (!suite) throw new Error(`Suite not found: ${suiteId}`);

    const startedAt = new Date().toISOString();
    const results: IValidationRunResult['results'] = [];
    let allPassed = true;

    for (const rule of suite.rules) {
      for (const check of rule.checks) {
        try {
          const queryResult = await queryService.executeQuery(connectionId, check.expression);
          const passed = evaluateCheck(check, queryResult);
          if (!passed) allPassed = false;
          results.push({
            ruleId: rule.id,
            checkId: check.id,
            passed,
            actual: JSON.stringify(queryResult.rows),
          });
        } catch (error) {
          allPassed = false;
          results.push({
            ruleId: rule.id,
            checkId: check.id,
            passed: false,
            error: (error as Error).message,
          });
        }
      }
    }

    return {
      id: crypto.randomUUID(),
      suiteId,
      connectionId,
      status: allPassed ? 'passed' : 'failed',
      results,
      startedAt,
      completedAt: new Date().toISOString(),
    };
  },
};
