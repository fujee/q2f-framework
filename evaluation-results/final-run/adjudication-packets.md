# Pending human adjudication packets

Deterministic evaluation stops at REVIEW_REQUIRED. The implementation does not adjudicate these questions.

## Q9-InteractiveWebProfile

- Pre-adjudication result: REVIEW_REQUIRED
- Concrete asset: public/evaluation-assets/q9-shapes.svg
- Existing response-relevant requirement: see exact QD below; no post-hoc requirement added.
- Adaptation/materialization: see exact QFD stimulus realization below.
- Allowed decision: PRESERVATION_CONFIRMED / VIOLATION_CONFIRMED / INSUFFICIENT_EVIDENCE
- Adjudicator role: _pending_
- Rationale: _pending_
- Final Conformance: _pending_

### Deterministic findings

```json
[
  {
    "affectedIds": [
      "q9-sr"
    ],
    "message": "Realized modality for 'q9-sr' is allowed by its QD Stimulus.",
    "ruleId": "CONF-STM-MOD-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q9-sr"
    ],
    "message": "Materialization mode for 'q9-sr' preserves QD policy.",
    "ruleId": "CONF-STM-MAT-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q9-sr"
    ],
    "message": "Semantic preservation for 'q9-sr' is deterministically established.",
    "ruleId": "CONF-STM-SEM-001",
    "status": "PASS"
  },
  {
    "message": "TaskInstruction presence for 'select' matches the QD.",
    "ruleId": "CONF-INS-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "select-task"
    ],
    "message": "TaskInstruction 'select-task' deterministically preserves the QD instruction.",
    "ruleId": "CONF-INS-002",
    "status": "PASS"
  },
  {
    "message": "Interaction 'select' retains its canonical response type.",
    "ruleId": "CONF-INT-001",
    "status": "PASS"
  },
  {
    "message": "Presentation order for 'select' preserves QD policy.",
    "ruleId": "CONF-SEL-ORD-001",
    "status": "PASS"
  },
  {
    "message": "Opaque Workspace location mapping for 'triangle' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'circle' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'square' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "QFD InteractionPrecedence transitively preserves every QD Sequence relation.",
    "ruleId": "CONF-SEQ-001",
    "status": "PASS"
  }
]
```

### Exact QD

```json
{
  "associations": [
    {
      "interactionRef": "select",
      "role": "Workspace",
      "stimulusRef": "q9-image"
    }
  ],
  "constraints": [],
  "id": "q9",
  "responseInteractions": [
    {
      "choices": [
        {
          "id": "triangle",
          "isCorrect": false,
          "placementSpecification": "The triangle region in the frozen image.",
          "semanticContent": "Triangle",
          "workspaceStimulusRef": "q9-image"
        },
        {
          "id": "circle",
          "isCorrect": true,
          "placementSpecification": "The circle region in the frozen image.",
          "semanticContent": "Circle",
          "workspaceStimulusRef": "q9-image"
        },
        {
          "id": "square",
          "isCorrect": false,
          "placementSpecification": "The square region in the frozen image.",
          "semanticContent": "Square",
          "workspaceStimulusRef": "q9-image"
        }
      ],
      "id": "select",
      "instruction": "Select the circle.",
      "maxSelections": 1,
      "minSelections": 1,
      "type": "Selecting"
    }
  ],
  "stimuli": [
    {
      "allowedModalities": [
        "Image"
      ],
      "id": "q9-image",
      "materializationPolicy": "Fixed",
      "sourceContent": {
        "representation": "Frozen image containing a triangle, circle, and square.",
        "sourceAnchorSupport": {
          "region": true,
          "text": false
        }
      }
    }
  ]
}
```

### Exact concrete QFD

```json
{
  "dependencyRealizations": [],
  "interactionPrecedences": [],
  "interactionRealizations": [
    {
      "instructionRealizations": [
        {
          "id": "select-task",
          "role": "TaskInstruction"
        }
      ],
      "interactionRef": "select",
      "type": "SelectingRealization",
      "workspaceRealizations": [
        {
          "choiceRealizations": [
            {
              "choiceRef": "triangle",
              "realizationAnchor": {
                "kind": "RegionRealizationAnchor",
                "payload": {
                  "implementationLocator": "triangle"
                }
              }
            },
            {
              "choiceRef": "circle",
              "realizationAnchor": {
                "kind": "RegionRealizationAnchor",
                "payload": {
                  "implementationLocator": "circle"
                }
              }
            },
            {
              "choiceRef": "square",
              "realizationAnchor": {
                "kind": "RegionRealizationAnchor",
                "payload": {
                  "implementationLocator": "square"
                }
              }
            }
          ],
          "mode": "DirectSelection",
          "stimulusRealizationRef": "q9-sr"
        }
      ]
    }
  ],
  "questionDefinitionRef": "q9",
  "rootLayout": {
    "children": [
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "q9-sr",
          "kind": "StimulusRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "select-task",
          "kind": "InstructionRealization"
        }
      }
    ],
    "kind": "LayoutGroup",
    "orientation": "Vertical"
  },
  "stimulusRealizations": [
    {
      "id": "q9-sr",
      "mode": "PreserveContent",
      "realizedModality": "Image",
      "servedInteractionRefs": [
        "select"
      ],
      "stimulusRef": "q9-image"
    }
  ],
  "targetProfileRef": "InteractiveWebProfile"
}
```

## Q9-ConventionalPaperProfile

- Pre-adjudication result: REVIEW_REQUIRED
- Concrete asset: public/evaluation-assets/q9-shapes.svg
- Existing response-relevant requirement: see exact QD below; no post-hoc requirement added.
- Adaptation/materialization: see exact QFD stimulus realization below.
- Allowed decision: PRESERVATION_CONFIRMED / VIOLATION_CONFIRMED / INSUFFICIENT_EVIDENCE
- Adjudicator role: _pending_
- Rationale: _pending_
- Final Conformance: _pending_

### Deterministic findings

```json
[
  {
    "affectedIds": [
      "q9-sr"
    ],
    "message": "Realized modality for 'q9-sr' is allowed by its QD Stimulus.",
    "ruleId": "CONF-STM-MOD-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q9-sr"
    ],
    "message": "Materialization mode for 'q9-sr' preserves QD policy.",
    "ruleId": "CONF-STM-MAT-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q9-sr"
    ],
    "message": "Semantic preservation for 'q9-sr' is deterministically established.",
    "ruleId": "CONF-STM-SEM-001",
    "status": "PASS"
  },
  {
    "message": "TaskInstruction presence for 'select' matches the QD.",
    "ruleId": "CONF-INS-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "select-task"
    ],
    "message": "TaskInstruction 'select-task' deterministically preserves the QD instruction.",
    "ruleId": "CONF-INS-002",
    "status": "PASS"
  },
  {
    "message": "Interaction 'select' retains its canonical response type.",
    "ruleId": "CONF-INT-001",
    "status": "PASS"
  },
  {
    "message": "Presentation order for 'select' preserves QD policy.",
    "ruleId": "CONF-SEL-ORD-001",
    "status": "PASS"
  },
  {
    "message": "Opaque Workspace location mapping for 'triangle' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'circle' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'square' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "ReferencedSelection for 'select' has trusted correspondence evidence.",
    "ruleId": "CONF-WRK-SEL-REF-001",
    "status": "PASS"
  },
  {
    "message": "QFD InteractionPrecedence transitively preserves every QD Sequence relation.",
    "ruleId": "CONF-SEQ-001",
    "status": "PASS"
  }
]
```

### Exact QD

```json
{
  "associations": [
    {
      "interactionRef": "select",
      "role": "Workspace",
      "stimulusRef": "q9-image"
    }
  ],
  "constraints": [],
  "id": "q9",
  "responseInteractions": [
    {
      "choices": [
        {
          "id": "triangle",
          "isCorrect": false,
          "placementSpecification": "The triangle region in the frozen image.",
          "semanticContent": "Triangle",
          "workspaceStimulusRef": "q9-image"
        },
        {
          "id": "circle",
          "isCorrect": true,
          "placementSpecification": "The circle region in the frozen image.",
          "semanticContent": "Circle",
          "workspaceStimulusRef": "q9-image"
        },
        {
          "id": "square",
          "isCorrect": false,
          "placementSpecification": "The square region in the frozen image.",
          "semanticContent": "Square",
          "workspaceStimulusRef": "q9-image"
        }
      ],
      "id": "select",
      "instruction": "Select the circle.",
      "maxSelections": 1,
      "minSelections": 1,
      "type": "Selecting"
    }
  ],
  "stimuli": [
    {
      "allowedModalities": [
        "Image"
      ],
      "id": "q9-image",
      "materializationPolicy": "Fixed",
      "sourceContent": {
        "representation": "Frozen image containing a triangle, circle, and square.",
        "sourceAnchorSupport": {
          "region": true,
          "text": false
        }
      }
    }
  ]
}
```

### Exact concrete QFD

```json
{
  "dependencyRealizations": [],
  "interactionPrecedences": [],
  "interactionRealizations": [
    {
      "instructionRealizations": [
        {
          "id": "select-task",
          "role": "TaskInstruction"
        }
      ],
      "interactionRef": "select",
      "type": "SelectingRealization",
      "workspaceRealizations": [
        {
          "choiceRealizations": [
            {
              "choiceRef": "triangle",
              "realizationAnchor": {
                "kind": "RegionRealizationAnchor",
                "payload": {
                  "implementationLocator": "triangle"
                }
              }
            },
            {
              "choiceRef": "circle",
              "realizationAnchor": {
                "kind": "RegionRealizationAnchor",
                "payload": {
                  "implementationLocator": "circle"
                }
              }
            },
            {
              "choiceRef": "square",
              "realizationAnchor": {
                "kind": "RegionRealizationAnchor",
                "payload": {
                  "implementationLocator": "square"
                }
              }
            }
          ],
          "mode": "ReferencedSelection",
          "referencedResponseSite": {
            "id": "q9-reference-site"
          },
          "stimulusRealizationRef": "q9-sr"
        }
      ]
    }
  ],
  "questionDefinitionRef": "q9",
  "rootLayout": {
    "children": [
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "q9-sr",
          "kind": "StimulusRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "select-task",
          "kind": "InstructionRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "q9-reference-site",
          "kind": "ResponseSiteRealization"
        }
      }
    ],
    "kind": "LayoutGroup",
    "orientation": "Vertical"
  },
  "stimulusRealizations": [
    {
      "id": "q9-sr",
      "mode": "PreserveContent",
      "realizedModality": "Image",
      "servedInteractionRefs": [
        "select"
      ],
      "stimulusRef": "q9-image"
    }
  ],
  "targetProfileRef": "ConventionalPaperProfile"
}
```

## Q10-InteractiveWebProfile

- Pre-adjudication result: REVIEW_REQUIRED
- Concrete asset: public/evaluation-assets/q10-heart.svg
- Existing response-relevant requirement: see exact QD below; no post-hoc requirement added.
- Adaptation/materialization: see exact QFD stimulus realization below.
- Allowed decision: PRESERVATION_CONFIRMED / VIOLATION_CONFIRMED / INSUFFICIENT_EVIDENCE
- Adjudicator role: _pending_
- Rationale: _pending_
- Final Conformance: _pending_

### Deterministic findings

```json
[
  {
    "affectedIds": [
      "q10-sr"
    ],
    "message": "Realized modality for 'q10-sr' is allowed by its QD Stimulus.",
    "ruleId": "CONF-STM-MOD-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q10-sr"
    ],
    "message": "Materialization mode for 'q10-sr' preserves QD policy.",
    "ruleId": "CONF-STM-MAT-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q10-sr"
    ],
    "message": "Semantic preservation for 'q10-sr' requires adjudication.",
    "ruleId": "CONF-STM-SEM-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "TaskInstruction presence for 'complete' matches the QD.",
    "ruleId": "CONF-INS-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "complete-task"
    ],
    "message": "TaskInstruction 'complete-task' deterministically preserves the QD instruction.",
    "ruleId": "CONF-INS-002",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "source-left-atrium-p"
    ],
    "message": "ElementPresentation 'source-left-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "source-right-atrium-p"
    ],
    "message": "ElementPresentation 'source-right-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "source-left-ventricle-p"
    ],
    "message": "ElementPresentation 'source-left-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "source-right-ventricle-p"
    ],
    "message": "ElementPresentation 'source-right-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "message": "Interaction 'complete' retains its canonical response type.",
    "ruleId": "CONF-INT-001",
    "status": "PASS"
  },
  {
    "message": "Gap identities for 'complete' are preserved.",
    "ruleId": "CONF-CMP-GAP-001",
    "status": "PASS"
  },
  {
    "message": "CompletingItem identities for 'complete' are preserved.",
    "ruleId": "CONF-CMP-ITEM-001",
    "status": "PASS"
  },
  {
    "message": "Opaque Workspace location mapping for 'gap-left-atrium' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'gap-right-atrium' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'gap-left-ventricle' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'gap-right-ventricle' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "QFD InteractionPrecedence transitively preserves every QD Sequence relation.",
    "ruleId": "CONF-SEQ-001",
    "status": "PASS"
  }
]
```

### Exact QD

```json
{
  "associations": [
    {
      "interactionRef": "complete",
      "role": "Workspace",
      "stimulusRef": "q10-spec"
    }
  ],
  "constraints": [],
  "id": "q10",
  "responseInteractions": [
    {
      "completingGaps": [
        {
          "correctItemRefs": [
            "left-atrium"
          ],
          "id": "gap-left-atrium",
          "placementSpecification": "The left-atrium region in the heart diagram.",
          "type": "ItemGap",
          "workspaceStimulusRef": "q10-spec"
        },
        {
          "correctItemRefs": [
            "right-atrium"
          ],
          "id": "gap-right-atrium",
          "placementSpecification": "The right-atrium region in the heart diagram.",
          "type": "ItemGap",
          "workspaceStimulusRef": "q10-spec"
        },
        {
          "correctItemRefs": [
            "left-ventricle"
          ],
          "id": "gap-left-ventricle",
          "placementSpecification": "The left-ventricle region in the heart diagram.",
          "type": "ItemGap",
          "workspaceStimulusRef": "q10-spec"
        },
        {
          "correctItemRefs": [
            "right-ventricle"
          ],
          "id": "gap-right-ventricle",
          "placementSpecification": "The right-ventricle region in the heart diagram.",
          "type": "ItemGap",
          "workspaceStimulusRef": "q10-spec"
        }
      ],
      "completingItems": [
        {
          "id": "left-atrium",
          "semanticContent": "Left atrium",
          "usageLimit": 1
        },
        {
          "id": "right-atrium",
          "semanticContent": "Right atrium",
          "usageLimit": 1
        },
        {
          "id": "left-ventricle",
          "semanticContent": "Left ventricle",
          "usageLimit": 1
        },
        {
          "id": "right-ventricle",
          "semanticContent": "Right ventricle",
          "usageLimit": 1
        }
      ],
      "id": "complete",
      "instruction": "Complete the diagram by placing the four chamber labels in the correct positions.",
      "type": "Completing"
    }
  ],
  "stimuli": [
    {
      "allowedModalities": [
        "Image"
      ],
      "contentSpecification": "A clear schematic human-heart diagram with four visually distinct chambers and no answer labels.",
      "id": "q10-spec",
      "materializationPolicy": "SpecificationBased"
    }
  ]
}
```

### Exact concrete QFD

```json
{
  "dependencyRealizations": [],
  "interactionPrecedences": [],
  "interactionRealizations": [
    {
      "gapRealizations": [
        {
          "assignmentMode": "DirectPlacement",
          "gapRef": "gap-left-atrium",
          "realizationAnchor": {
            "kind": "RegionRealizationAnchor",
            "payload": {
              "implementationLocator": "gap-left-atrium"
            }
          },
          "responsePlacement": "Embedded",
          "stimulusRealizationRef": "q10-sr",
          "type": "ItemGapRealization"
        },
        {
          "assignmentMode": "DirectPlacement",
          "gapRef": "gap-right-atrium",
          "realizationAnchor": {
            "kind": "RegionRealizationAnchor",
            "payload": {
              "implementationLocator": "gap-right-atrium"
            }
          },
          "responsePlacement": "Embedded",
          "stimulusRealizationRef": "q10-sr",
          "type": "ItemGapRealization"
        },
        {
          "assignmentMode": "DirectPlacement",
          "gapRef": "gap-left-ventricle",
          "realizationAnchor": {
            "kind": "RegionRealizationAnchor",
            "payload": {
              "implementationLocator": "gap-left-ventricle"
            }
          },
          "responsePlacement": "Embedded",
          "stimulusRealizationRef": "q10-sr",
          "type": "ItemGapRealization"
        },
        {
          "assignmentMode": "DirectPlacement",
          "gapRef": "gap-right-ventricle",
          "realizationAnchor": {
            "kind": "RegionRealizationAnchor",
            "payload": {
              "implementationLocator": "gap-right-ventricle"
            }
          },
          "responsePlacement": "Embedded",
          "stimulusRealizationRef": "q10-sr",
          "type": "ItemGapRealization"
        }
      ],
      "instructionRealizations": [
        {
          "id": "complete-task",
          "role": "TaskInstruction"
        }
      ],
      "interactionRef": "complete",
      "itemSource": {
        "id": "complete-item-source",
        "itemPresentations": [
          {
            "elementRef": {
              "completingItemRef": "left-atrium",
              "interactionRef": "complete",
              "kind": "CompletingItem"
            },
            "id": "source-left-atrium-p"
          },
          {
            "elementRef": {
              "completingItemRef": "right-atrium",
              "interactionRef": "complete",
              "kind": "CompletingItem"
            },
            "id": "source-right-atrium-p"
          },
          {
            "elementRef": {
              "completingItemRef": "left-ventricle",
              "interactionRef": "complete",
              "kind": "CompletingItem"
            },
            "id": "source-left-ventricle-p"
          },
          {
            "elementRef": {
              "completingItemRef": "right-ventricle",
              "interactionRef": "complete",
              "kind": "CompletingItem"
            },
            "id": "source-right-ventricle-p"
          }
        ],
        "localLayout": {
          "children": [
            {
              "kind": "LayoutPlacement",
              "realizationRef": {
                "id": "source-left-atrium-p",
                "kind": "ElementPresentation"
              }
            },
            {
              "kind": "LayoutPlacement",
              "realizationRef": {
                "id": "source-right-atrium-p",
                "kind": "ElementPresentation"
              }
            },
            {
              "kind": "LayoutPlacement",
              "realizationRef": {
                "id": "source-left-ventricle-p",
                "kind": "ElementPresentation"
              }
            },
            {
              "kind": "LayoutPlacement",
              "realizationRef": {
                "id": "source-right-ventricle-p",
                "kind": "ElementPresentation"
              }
            }
          ],
          "kind": "LayoutGroup",
          "orientation": "Horizontal"
        }
      },
      "type": "CompletingRealization"
    }
  ],
  "questionDefinitionRef": "q10",
  "rootLayout": {
    "children": [
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "q10-sr",
          "kind": "StimulusRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "complete-task",
          "kind": "InstructionRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "complete-item-source",
          "kind": "CompletingItemSourceRealization"
        }
      }
    ],
    "kind": "LayoutGroup",
    "orientation": "Vertical"
  },
  "stimulusRealizations": [
    {
      "id": "q10-sr",
      "mode": "MaterializeFromSpecification",
      "realizedContent": {
        "representation": "Versioned concrete schematic human-heart image with four visually distinct chambers.",
        "sourceAnchorSupport": {
          "region": true,
          "text": false
        }
      },
      "realizedModality": "Image",
      "servedInteractionRefs": [
        "complete"
      ],
      "stimulusRef": "q10-spec"
    }
  ],
  "targetProfileRef": "InteractiveWebProfile"
}
```

## Q10-ConventionalPaperProfile

- Pre-adjudication result: REVIEW_REQUIRED
- Concrete asset: public/evaluation-assets/q10-heart.svg
- Existing response-relevant requirement: see exact QD below; no post-hoc requirement added.
- Adaptation/materialization: see exact QFD stimulus realization below.
- Allowed decision: PRESERVATION_CONFIRMED / VIOLATION_CONFIRMED / INSUFFICIENT_EVIDENCE
- Adjudicator role: _pending_
- Rationale: _pending_
- Final Conformance: _pending_

### Deterministic findings

```json
[
  {
    "affectedIds": [
      "q10-sr"
    ],
    "message": "Realized modality for 'q10-sr' is allowed by its QD Stimulus.",
    "ruleId": "CONF-STM-MOD-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q10-sr"
    ],
    "message": "Materialization mode for 'q10-sr' preserves QD policy.",
    "ruleId": "CONF-STM-MAT-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q10-sr"
    ],
    "message": "Semantic preservation for 'q10-sr' requires adjudication.",
    "ruleId": "CONF-STM-SEM-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "TaskInstruction presence for 'complete' matches the QD.",
    "ruleId": "CONF-INS-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "complete-task"
    ],
    "message": "TaskInstruction 'complete-task' deterministically preserves the QD instruction.",
    "ruleId": "CONF-INS-002",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-left-atrium-left-atrium-p"
    ],
    "message": "ElementPresentation 'gap-left-atrium-left-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-left-atrium-right-atrium-p"
    ],
    "message": "ElementPresentation 'gap-left-atrium-right-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-left-atrium-left-ventricle-p"
    ],
    "message": "ElementPresentation 'gap-left-atrium-left-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-left-atrium-right-ventricle-p"
    ],
    "message": "ElementPresentation 'gap-left-atrium-right-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-right-atrium-left-atrium-p"
    ],
    "message": "ElementPresentation 'gap-right-atrium-left-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-right-atrium-right-atrium-p"
    ],
    "message": "ElementPresentation 'gap-right-atrium-right-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-right-atrium-left-ventricle-p"
    ],
    "message": "ElementPresentation 'gap-right-atrium-left-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-right-atrium-right-ventricle-p"
    ],
    "message": "ElementPresentation 'gap-right-atrium-right-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-left-ventricle-left-atrium-p"
    ],
    "message": "ElementPresentation 'gap-left-ventricle-left-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-left-ventricle-right-atrium-p"
    ],
    "message": "ElementPresentation 'gap-left-ventricle-right-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-left-ventricle-left-ventricle-p"
    ],
    "message": "ElementPresentation 'gap-left-ventricle-left-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-left-ventricle-right-ventricle-p"
    ],
    "message": "ElementPresentation 'gap-left-ventricle-right-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-right-ventricle-left-atrium-p"
    ],
    "message": "ElementPresentation 'gap-right-ventricle-left-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-right-ventricle-right-atrium-p"
    ],
    "message": "ElementPresentation 'gap-right-ventricle-right-atrium-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-right-ventricle-left-ventricle-p"
    ],
    "message": "ElementPresentation 'gap-right-ventricle-left-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "gap-right-ventricle-right-ventricle-p"
    ],
    "message": "ElementPresentation 'gap-right-ventricle-right-ventricle-p' preserves semantic content.",
    "ruleId": "CONF-PRES-001",
    "status": "PASS"
  },
  {
    "message": "Interaction 'complete' retains its canonical response type.",
    "ruleId": "CONF-INT-001",
    "status": "PASS"
  },
  {
    "message": "Gap identities for 'complete' are preserved.",
    "ruleId": "CONF-CMP-GAP-001",
    "status": "PASS"
  },
  {
    "message": "CompletingItem identities for 'complete' are preserved.",
    "ruleId": "CONF-CMP-ITEM-001",
    "status": "PASS"
  },
  {
    "message": "Opaque Workspace location mapping for 'gap-left-atrium' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'gap-right-atrium' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'gap-left-ventricle' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Opaque Workspace location mapping for 'gap-right-ventricle' requires review.",
    "ruleId": "CONF-WRK-LOC-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "QFD InteractionPrecedence transitively preserves every QD Sequence relation.",
    "ruleId": "CONF-SEQ-001",
    "status": "PASS"
  }
]
```

### Exact QD

```json
{
  "associations": [
    {
      "interactionRef": "complete",
      "role": "Workspace",
      "stimulusRef": "q10-spec"
    }
  ],
  "constraints": [],
  "id": "q10",
  "responseInteractions": [
    {
      "completingGaps": [
        {
          "correctItemRefs": [
            "left-atrium"
          ],
          "id": "gap-left-atrium",
          "placementSpecification": "The left-atrium region in the heart diagram.",
          "type": "ItemGap",
          "workspaceStimulusRef": "q10-spec"
        },
        {
          "correctItemRefs": [
            "right-atrium"
          ],
          "id": "gap-right-atrium",
          "placementSpecification": "The right-atrium region in the heart diagram.",
          "type": "ItemGap",
          "workspaceStimulusRef": "q10-spec"
        },
        {
          "correctItemRefs": [
            "left-ventricle"
          ],
          "id": "gap-left-ventricle",
          "placementSpecification": "The left-ventricle region in the heart diagram.",
          "type": "ItemGap",
          "workspaceStimulusRef": "q10-spec"
        },
        {
          "correctItemRefs": [
            "right-ventricle"
          ],
          "id": "gap-right-ventricle",
          "placementSpecification": "The right-ventricle region in the heart diagram.",
          "type": "ItemGap",
          "workspaceStimulusRef": "q10-spec"
        }
      ],
      "completingItems": [
        {
          "id": "left-atrium",
          "semanticContent": "Left atrium",
          "usageLimit": 1
        },
        {
          "id": "right-atrium",
          "semanticContent": "Right atrium",
          "usageLimit": 1
        },
        {
          "id": "left-ventricle",
          "semanticContent": "Left ventricle",
          "usageLimit": 1
        },
        {
          "id": "right-ventricle",
          "semanticContent": "Right ventricle",
          "usageLimit": 1
        }
      ],
      "id": "complete",
      "instruction": "Complete the diagram by placing the four chamber labels in the correct positions.",
      "type": "Completing"
    }
  ],
  "stimuli": [
    {
      "allowedModalities": [
        "Image"
      ],
      "contentSpecification": "A clear schematic human-heart diagram with four visually distinct chambers and no answer labels.",
      "id": "q10-spec",
      "materializationPolicy": "SpecificationBased"
    }
  ]
}
```

### Exact concrete QFD

```json
{
  "dependencyRealizations": [],
  "interactionPrecedences": [],
  "interactionRealizations": [
    {
      "gapRealizations": [
        {
          "assignmentMode": "ItemSelection",
          "gapRef": "gap-left-atrium",
          "realizationAnchor": {
            "kind": "RegionRealizationAnchor",
            "payload": {
              "implementationLocator": "gap-left-atrium"
            }
          },
          "responsePlacement": "Embedded",
          "selectionPresentation": {
            "id": "gap-left-atrium-selection",
            "localLayout": {
              "children": [
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-left-atrium-left-atrium-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-left-atrium-right-atrium-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-left-atrium-left-ventricle-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-left-atrium-right-ventricle-p",
                    "kind": "ElementPresentation"
                  }
                }
              ],
              "kind": "LayoutGroup",
              "orientation": "Horizontal"
            },
            "mode": "Expanded",
            "optionPresentations": [
              {
                "elementRef": {
                  "completingItemRef": "left-atrium",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-left-atrium-left-atrium-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "right-atrium",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-left-atrium-right-atrium-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "left-ventricle",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-left-atrium-left-ventricle-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "right-ventricle",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-left-atrium-right-ventricle-p"
              }
            ]
          },
          "stimulusRealizationRef": "q10-sr",
          "type": "ItemGapRealization"
        },
        {
          "assignmentMode": "ItemSelection",
          "gapRef": "gap-right-atrium",
          "realizationAnchor": {
            "kind": "RegionRealizationAnchor",
            "payload": {
              "implementationLocator": "gap-right-atrium"
            }
          },
          "responsePlacement": "Embedded",
          "selectionPresentation": {
            "id": "gap-right-atrium-selection",
            "localLayout": {
              "children": [
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-right-atrium-left-atrium-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-right-atrium-right-atrium-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-right-atrium-left-ventricle-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-right-atrium-right-ventricle-p",
                    "kind": "ElementPresentation"
                  }
                }
              ],
              "kind": "LayoutGroup",
              "orientation": "Horizontal"
            },
            "mode": "Expanded",
            "optionPresentations": [
              {
                "elementRef": {
                  "completingItemRef": "left-atrium",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-right-atrium-left-atrium-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "right-atrium",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-right-atrium-right-atrium-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "left-ventricle",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-right-atrium-left-ventricle-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "right-ventricle",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-right-atrium-right-ventricle-p"
              }
            ]
          },
          "stimulusRealizationRef": "q10-sr",
          "type": "ItemGapRealization"
        },
        {
          "assignmentMode": "ItemSelection",
          "gapRef": "gap-left-ventricle",
          "realizationAnchor": {
            "kind": "RegionRealizationAnchor",
            "payload": {
              "implementationLocator": "gap-left-ventricle"
            }
          },
          "responsePlacement": "Embedded",
          "selectionPresentation": {
            "id": "gap-left-ventricle-selection",
            "localLayout": {
              "children": [
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-left-ventricle-left-atrium-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-left-ventricle-right-atrium-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-left-ventricle-left-ventricle-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-left-ventricle-right-ventricle-p",
                    "kind": "ElementPresentation"
                  }
                }
              ],
              "kind": "LayoutGroup",
              "orientation": "Horizontal"
            },
            "mode": "Expanded",
            "optionPresentations": [
              {
                "elementRef": {
                  "completingItemRef": "left-atrium",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-left-ventricle-left-atrium-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "right-atrium",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-left-ventricle-right-atrium-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "left-ventricle",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-left-ventricle-left-ventricle-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "right-ventricle",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-left-ventricle-right-ventricle-p"
              }
            ]
          },
          "stimulusRealizationRef": "q10-sr",
          "type": "ItemGapRealization"
        },
        {
          "assignmentMode": "ItemSelection",
          "gapRef": "gap-right-ventricle",
          "realizationAnchor": {
            "kind": "RegionRealizationAnchor",
            "payload": {
              "implementationLocator": "gap-right-ventricle"
            }
          },
          "responsePlacement": "Embedded",
          "selectionPresentation": {
            "id": "gap-right-ventricle-selection",
            "localLayout": {
              "children": [
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-right-ventricle-left-atrium-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-right-ventricle-right-atrium-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-right-ventricle-left-ventricle-p",
                    "kind": "ElementPresentation"
                  }
                },
                {
                  "kind": "LayoutPlacement",
                  "realizationRef": {
                    "id": "gap-right-ventricle-right-ventricle-p",
                    "kind": "ElementPresentation"
                  }
                }
              ],
              "kind": "LayoutGroup",
              "orientation": "Horizontal"
            },
            "mode": "Expanded",
            "optionPresentations": [
              {
                "elementRef": {
                  "completingItemRef": "left-atrium",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-right-ventricle-left-atrium-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "right-atrium",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-right-ventricle-right-atrium-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "left-ventricle",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-right-ventricle-left-ventricle-p"
              },
              {
                "elementRef": {
                  "completingItemRef": "right-ventricle",
                  "interactionRef": "complete",
                  "kind": "CompletingItem"
                },
                "id": "gap-right-ventricle-right-ventricle-p"
              }
            ]
          },
          "stimulusRealizationRef": "q10-sr",
          "type": "ItemGapRealization"
        }
      ],
      "instructionRealizations": [
        {
          "id": "complete-task",
          "role": "TaskInstruction"
        }
      ],
      "interactionRef": "complete",
      "type": "CompletingRealization"
    }
  ],
  "questionDefinitionRef": "q10",
  "rootLayout": {
    "children": [
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "q10-sr",
          "kind": "StimulusRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "complete-task",
          "kind": "InstructionRealization"
        }
      }
    ],
    "kind": "LayoutGroup",
    "orientation": "Vertical"
  },
  "stimulusRealizations": [
    {
      "id": "q10-sr",
      "mode": "MaterializeFromSpecification",
      "realizedContent": {
        "representation": "Versioned concrete schematic human-heart image with four visually distinct chambers.",
        "sourceAnchorSupport": {
          "region": true,
          "text": false
        }
      },
      "realizedModality": "Image",
      "servedInteractionRefs": [
        "complete"
      ],
      "stimulusRef": "q10-spec"
    }
  ],
  "targetProfileRef": "ConventionalPaperProfile"
}
```

## Q11-InteractiveWebProfile

- Pre-adjudication result: REVIEW_REQUIRED
- Concrete asset: public/evaluation-assets/q11-bars.svg
- Existing response-relevant requirement: see exact QD below; no post-hoc requirement added.
- Adaptation/materialization: see exact QFD stimulus realization below.
- Allowed decision: PRESERVATION_CONFIRMED / VIOLATION_CONFIRMED / INSUFFICIENT_EVIDENCE
- Adjudicator role: _pending_
- Rationale: _pending_
- Final Conformance: _pending_

### Deterministic findings

```json
[
  {
    "affectedIds": [
      "q11-sr"
    ],
    "message": "Realized modality for 'q11-sr' is allowed by its QD Stimulus.",
    "ruleId": "CONF-STM-MOD-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q11-sr"
    ],
    "message": "Materialization mode for 'q11-sr' preserves QD policy.",
    "ruleId": "CONF-STM-MAT-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q11-sr"
    ],
    "message": "Semantic preservation for 'q11-sr' requires adjudication.",
    "ruleId": "CONF-STM-SEM-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Context has a corresponding SR serving the owning interaction.",
    "ruleId": "CONF-CTX-001",
    "status": "PASS"
  },
  {
    "message": "TaskInstruction presence for 'short' matches the QD.",
    "ruleId": "CONF-INS-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "short-task"
    ],
    "message": "TaskInstruction 'short-task' deterministically preserves the QD instruction.",
    "ruleId": "CONF-INS-002",
    "status": "PASS"
  },
  {
    "message": "Interaction 'short' retains its canonical response type.",
    "ruleId": "CONF-INT-001",
    "status": "PASS"
  },
  {
    "message": "QFD InteractionPrecedence transitively preserves every QD Sequence relation.",
    "ruleId": "CONF-SEQ-001",
    "status": "PASS"
  }
]
```

### Exact QD

```json
{
  "associations": [
    {
      "interactionRef": "short",
      "role": "Context",
      "stimulusRef": "q11-image"
    }
  ],
  "constraints": [],
  "id": "q11",
  "responseInteractions": [
    {
      "correctValues": [
        60
      ],
      "id": "short",
      "inputType": "Number",
      "instruction": "What value does the chart show for 2020?",
      "type": "ShortInput"
    }
  ],
  "stimuli": [
    {
      "allowedModalities": [
        "Image"
      ],
      "contentSpecification": "Preserve the years 2019/2020/2021, values 40/60/50, their year-value mapping, and sufficient scale/axis information.",
      "id": "q11-image",
      "materializationPolicy": "Adaptable",
      "sourceContent": {
        "representation": "Source bar chart: 2019 → 40; 2020 → 60; 2021 → 50, with scale and axes.",
        "sourceAnchorSupport": {
          "region": true,
          "text": false
        }
      }
    }
  ]
}
```

### Exact concrete QFD

```json
{
  "dependencyRealizations": [],
  "interactionPrecedences": [],
  "interactionRealizations": [
    {
      "instructionRealizations": [
        {
          "id": "short-task",
          "role": "TaskInstruction"
        }
      ],
      "interactionRef": "short",
      "responseSite": {
        "id": "short-site"
      },
      "type": "ShortInputRealization"
    }
  ],
  "questionDefinitionRef": "q11",
  "rootLayout": {
    "children": [
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "q11-sr",
          "kind": "StimulusRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "short-task",
          "kind": "InstructionRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "short-site",
          "kind": "ResponseSiteRealization"
        }
      }
    ],
    "kind": "LayoutGroup",
    "orientation": "Vertical"
  },
  "stimulusRealizations": [
    {
      "id": "q11-sr",
      "mode": "AdaptContent",
      "realizedContent": {
        "representation": "Versioned adapted bar chart preserving 2019 → 40; 2020 → 60; 2021 → 50 with sufficient scale and axes.",
        "sourceAnchorSupport": {
          "region": true,
          "text": false
        }
      },
      "realizedModality": "Image",
      "servedInteractionRefs": [
        "short"
      ],
      "stimulusRef": "q11-image"
    }
  ],
  "targetProfileRef": "InteractiveWebProfile"
}
```

## Q11-ConventionalPaperProfile

- Pre-adjudication result: REVIEW_REQUIRED
- Concrete asset: public/evaluation-assets/q11-bars.svg
- Existing response-relevant requirement: see exact QD below; no post-hoc requirement added.
- Adaptation/materialization: see exact QFD stimulus realization below.
- Allowed decision: PRESERVATION_CONFIRMED / VIOLATION_CONFIRMED / INSUFFICIENT_EVIDENCE
- Adjudicator role: _pending_
- Rationale: _pending_
- Final Conformance: _pending_

### Deterministic findings

```json
[
  {
    "affectedIds": [
      "q11-sr"
    ],
    "message": "Realized modality for 'q11-sr' is allowed by its QD Stimulus.",
    "ruleId": "CONF-STM-MOD-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q11-sr"
    ],
    "message": "Materialization mode for 'q11-sr' preserves QD policy.",
    "ruleId": "CONF-STM-MAT-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "q11-sr"
    ],
    "message": "Semantic preservation for 'q11-sr' requires adjudication.",
    "ruleId": "CONF-STM-SEM-001",
    "status": "REVIEW_REQUIRED"
  },
  {
    "message": "Context has a corresponding SR serving the owning interaction.",
    "ruleId": "CONF-CTX-001",
    "status": "PASS"
  },
  {
    "message": "TaskInstruction presence for 'short' matches the QD.",
    "ruleId": "CONF-INS-001",
    "status": "PASS"
  },
  {
    "affectedIds": [
      "short-task"
    ],
    "message": "TaskInstruction 'short-task' deterministically preserves the QD instruction.",
    "ruleId": "CONF-INS-002",
    "status": "PASS"
  },
  {
    "message": "Interaction 'short' retains its canonical response type.",
    "ruleId": "CONF-INT-001",
    "status": "PASS"
  },
  {
    "message": "QFD InteractionPrecedence transitively preserves every QD Sequence relation.",
    "ruleId": "CONF-SEQ-001",
    "status": "PASS"
  }
]
```

### Exact QD

```json
{
  "associations": [
    {
      "interactionRef": "short",
      "role": "Context",
      "stimulusRef": "q11-image"
    }
  ],
  "constraints": [],
  "id": "q11",
  "responseInteractions": [
    {
      "correctValues": [
        60
      ],
      "id": "short",
      "inputType": "Number",
      "instruction": "What value does the chart show for 2020?",
      "type": "ShortInput"
    }
  ],
  "stimuli": [
    {
      "allowedModalities": [
        "Image"
      ],
      "contentSpecification": "Preserve the years 2019/2020/2021, values 40/60/50, their year-value mapping, and sufficient scale/axis information.",
      "id": "q11-image",
      "materializationPolicy": "Adaptable",
      "sourceContent": {
        "representation": "Source bar chart: 2019 → 40; 2020 → 60; 2021 → 50, with scale and axes.",
        "sourceAnchorSupport": {
          "region": true,
          "text": false
        }
      }
    }
  ]
}
```

### Exact concrete QFD

```json
{
  "dependencyRealizations": [],
  "interactionPrecedences": [],
  "interactionRealizations": [
    {
      "instructionRealizations": [
        {
          "id": "short-task",
          "role": "TaskInstruction"
        }
      ],
      "interactionRef": "short",
      "responseSite": {
        "id": "short-site"
      },
      "type": "ShortInputRealization"
    }
  ],
  "questionDefinitionRef": "q11",
  "rootLayout": {
    "children": [
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "q11-sr",
          "kind": "StimulusRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "short-task",
          "kind": "InstructionRealization"
        }
      },
      {
        "kind": "LayoutPlacement",
        "realizationRef": {
          "id": "short-site",
          "kind": "ResponseSiteRealization"
        }
      }
    ],
    "kind": "LayoutGroup",
    "orientation": "Vertical"
  },
  "stimulusRealizations": [
    {
      "id": "q11-sr",
      "mode": "AdaptContent",
      "realizedContent": {
        "representation": "Versioned adapted bar chart preserving 2019 → 40; 2020 → 60; 2021 → 50 with sufficient scale and axes.",
        "sourceAnchorSupport": {
          "region": true,
          "text": false
        }
      },
      "realizedModality": "Image",
      "servedInteractionRefs": [
        "short"
      ],
      "stimulusRef": "q11-image"
    }
  ],
  "targetProfileRef": "ConventionalPaperProfile"
}
```
