/** Trusted deterministic evidence is implementation/evaluation data, not QD/QFD. */
export interface ConformanceEvidence {
  /** The concrete SR directly uses the QD source carrier/representation. */
  directSourceReuseStimulusRealizationIds?: ReadonlySet<string>
  /** Semantic preservation is proven without claiming source-carrier reuse. */
  preservedStimulusRealizationIds?: ReadonlySet<string>
  trustedTaskInstructionIds?: ReadonlySet<string>
  trustedOperationalGuidanceIds?: ReadonlySet<string>
  trustedElementPresentationIds?: ReadonlySet<string>
  trustedRelatingSetPresentationIds?: ReadonlySet<string>
  trustedWorkspaceBindingKeys?: ReadonlySet<string>
  trustedReferencedSelectionInteractionRefs?: ReadonlySet<string>
  trustedRelationNotationInteractionRefs?: ReadonlySet<string>
  trustedReferencedGapKeys?: ReadonlySet<string>
  trustedArtifactInteractionRefs?: ReadonlySet<string>
}

export function workspaceBindingKey(
  interactionRef: string,
  elementRef: string
): string {
  return `${interactionRef}::${elementRef}`
}
