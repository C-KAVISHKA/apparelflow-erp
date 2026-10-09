/**
 * ApparelFlow ERP — Core Domain Logic & Validation Engine
 * Shared between API route handlers, frontend terminals, and automated test suites.
 */

export type ComponentStatus = "GREEN" | "YELLOW" | "RED" | "PENDING";

export interface VerificationItemInput {
  componentId: string;
  expectedQty: number;
}

export interface EvaluatedComponentItem {
  componentId: string;
  expectedQty: number;
  actualQty: number;
  status: ComponentStatus;
}

/**
 * Evaluates physical counts against expected quantities.
 * - GREEN (MATCH): actual === expected
 * - YELLOW (EXCESS): actual > expected
 * - RED (SHORTAGE): actual < expected or invalid/missing
 */
export function evaluateComponentCount(expectedQty: number, actualQtyInput: unknown): {
  actualQty: number;
  status: ComponentStatus;
} {
  if (
    actualQtyInput === undefined ||
    actualQtyInput === null ||
    actualQtyInput === "" ||
    typeof actualQtyInput !== "number" ||
    isNaN(actualQtyInput) ||
    actualQtyInput < 0 ||
    !Number.isInteger(actualQtyInput)
  ) {
    return { actualQty: 0, status: "RED" };
  }

  const actualQty = actualQtyInput;
  if (actualQty === expectedQty) {
    return { actualQty, status: "GREEN" };
  } else if (actualQty > expectedQty) {
    return { actualQty, status: "YELLOW" };
  } else {
    return { actualQty, status: "RED" };
  }
}

/**
 * Batch evaluates an entire Bill of Materials component list.
 * Returns evaluated items and a boolean flag indicating if ANY component has a RED shortage.
 */
export function evaluateAllComponents(
  expectedItems: VerificationItemInput[],
  countsMap: Record<string, unknown>
): {
  items: EvaluatedComponentItem[];
  hasRed: boolean;
  allGreen: boolean;
} {
  const items = expectedItems.map((item) => {
    const rawVal = countsMap[item.componentId];
    const { actualQty, status } = evaluateComponentCount(item.expectedQty, rawVal);
    return {
      componentId: item.componentId,
      expectedQty: item.expectedQty,
      actualQty,
      status,
    };
  });

  const hasRed = items.some((i) => i.status === "RED");
  const allGreen = items.every((i) => i.status === "GREEN");

  return { items, hasRed, allGreen };
}

/**
 * Calculates Fabric Wastage Percentage:
 * Formula: ((Actual Fabric Used - Expected Fabric) / Expected Fabric) * 100
 */
export function calculateFabricWastagePct(
  actualFabricYards: number,
  stdFabricYardsPerUnit: number,
  targetBatchQty: number
): {
  expectedFabricYards: number;
  wastagePct: number;
  isOverCap: boolean;
} {
  if (stdFabricYardsPerUnit <= 0 || targetBatchQty <= 0) {
    return { expectedFabricYards: 0, wastagePct: 0, isOverCap: false };
  }

  const expectedFabricYards = stdFabricYardsPerUnit * targetBatchQty;
  const rawPct = ((actualFabricYards - expectedFabricYards) / expectedFabricYards) * 100;
  const wastagePct = Math.round(rawPct * 100) / 100;

  return {
    expectedFabricYards,
    wastagePct,
    isOverCap: false, // caller compares against recipe cap
  };
}

/**
 * Validates mandatory rejection explanation note.
 * Must be a non-empty string of at least 5 non-whitespace characters.
 */
export function validateRejectionNote(note: unknown): {
  valid: boolean;
  cleanNote?: string;
  error?: string;
} {
  if (!note || typeof note !== "string") {
    return { valid: false, error: "A rejection reason note is mandatory." };
  }

  const clean = note.trim();
  if (clean.length < 5) {
    return {
      valid: false,
      error: "Rejection explanation must contain at least 5 descriptive characters.",
    };
  }

  return { valid: true, cleanNote: clean };
}

/**
 * Validates cutting order creation parameters.
 */
export function validateCuttingOrderInput(input: {
  recipeId: unknown;
  targetQty: unknown;
  fabricRollId: unknown;
  actualFabricYds: unknown;
}): {
  valid: boolean;
  data?: {
    recipeId: string;
    targetQty: number;
    fabricRollId: string;
    actualFabricYds: number;
  };
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!input.recipeId || typeof input.recipeId !== "string" || !input.recipeId.trim()) {
    errors.recipeId = "Production recipe selection is required.";
  }

  if (
    typeof input.targetQty !== "number" ||
    isNaN(input.targetQty) ||
    !Number.isFinite(input.targetQty) ||
    input.targetQty <= 0 ||
    !Number.isInteger(input.targetQty)
  ) {
    errors.targetQty = "Target batch quantity must be a positive integer.";
  }

  if (
    !input.fabricRollId ||
    typeof input.fabricRollId !== "string" ||
    !input.fabricRollId.trim()
  ) {
    errors.fabricRollId = "Fabric roll identification is required.";
  }

  if (
    typeof input.actualFabricYds !== "number" ||
    isNaN(input.actualFabricYds) ||
    !Number.isFinite(input.actualFabricYds) ||
    input.actualFabricYds <= 0
  ) {
    errors.actualFabricYds = "Actual fabric consumed must be a positive numeric value.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      recipeId: (input.recipeId as string).trim(),
      targetQty: input.targetQty as number,
      fabricRollId: (input.fabricRollId as string).trim(),
      actualFabricYds: input.actualFabricYds as number,
    },
    errors: {},
  };
}
