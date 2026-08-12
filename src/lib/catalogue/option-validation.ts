export type ProductOptionSelection = {
  optionGroupId: string;
  optionValueId: string;
};

export type ProductOptionGroupConstraint = {
  id: string;
  isRequired: boolean;
  maximumSelections: number | null;
  minimumSelections: number;
};

export type ProductOptionValueReference = {
  id: string;
  optionGroupId: string;
};

export type ProductOptionRule = {
  message: string | null;
  relatedOptionValueId: string;
  ruleType: "excludes" | "requires";
  subjectOptionValueId: string;
};

export function validateProductOptionSelections(
  groups: ProductOptionGroupConstraint[],
  values: ProductOptionValueReference[],
  selections: ProductOptionSelection[],
  rules: ProductOptionRule[],
): string | null {
  const selectedValuesByGroup = new Map<string, Set<string>>();

  for (const selection of selections) {
    const selectedValues =
      selectedValuesByGroup.get(selection.optionGroupId) ?? new Set<string>();
    selectedValues.add(selection.optionValueId);
    selectedValuesByGroup.set(selection.optionGroupId, selectedValues);
  }

  if (
    [...selectedValuesByGroup.keys()].some(
      (groupId) => !groups.some((group) => group.id === groupId),
    )
  ) {
    return "One or more product options are unavailable or incompatible.";
  }

  for (const group of groups) {
    const selectedCount = selectedValuesByGroup.get(group.id)?.size ?? 0;
    const minimumSelections = Math.max(
      group.minimumSelections,
      group.isRequired ? 1 : 0,
    );

    if (
      selectedCount < minimumSelections ||
      (group.maximumSelections !== null &&
        selectedCount > group.maximumSelections)
    ) {
      return "One or more product options are unavailable or incompatible.";
    }
  }

  const selectedValueIds = new Set(
    [...selectedValuesByGroup.values()].flatMap((selectedValues) => [
      ...selectedValues,
    ]),
  );

  if (
    selectedValueIds.size !== values.length ||
    values.some(
      (value) => !selectedValuesByGroup.get(value.optionGroupId)?.has(value.id),
    )
  ) {
    return "One or more product options are unavailable or incompatible.";
  }

  const violatedRule = rules.find(
    (rule) =>
      selectedValueIds.has(rule.subjectOptionValueId) &&
      ((rule.ruleType === "requires" &&
        !selectedValueIds.has(rule.relatedOptionValueId)) ||
        (rule.ruleType === "excludes" &&
          selectedValueIds.has(rule.relatedOptionValueId))),
  );

  if (!violatedRule) return null;

  return (
    violatedRule.message ??
    "One or more product options are unavailable or incompatible."
  );
}
